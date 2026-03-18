const { chatCompletion } = require('@huggingface/inference');
const ChatMessage = require('../models/ChatMessage');
const GarbageReport = require('../models/GarbageReport');
const Blog = require('../models/Blog');
const Donation = require('../models/Donation');
const Team = require('../models/Team');

const HF_TOKEN = process.env.HUGGING_FACE_API_KEY;

async function getProjectContext(userId, userName) {
  const [totalReports, pendingReports, assignedReports, cleanedReports, userReports, totalTeams, totalBlogs, totalDonations] = await Promise.all([
    GarbageReport.countDocuments(),
    GarbageReport.countDocuments({ status: 'Pending' }),
    GarbageReport.countDocuments({ status: 'Assigned' }),
    GarbageReport.countDocuments({ status: 'Cleaned' }),
    userName ? GarbageReport.find({ reportedBy: userName }).sort({ createdAt: -1 }).limit(5).select('location status createdAt description') : [],
    Team.countDocuments(),
    Blog.countDocuments(),
    Donation.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
  ]);

  const donationTotal = totalDonations[0]?.total || 0;

  let userReportsSummary = '';
  if (userReports.length > 0) {
    userReportsSummary = `\n\nYour recent reports:\n` + userReports.map((r, i) =>
      `${i + 1}. ${r.location.area}, ${r.location.city} - Status: ${r.status} (${r.description.substring(0, 50)}...)`
    ).join('\n');
  }

  return `You are a friendly assistant for "Swachh Sena", an app that helps people report garbage and track cleanups in their city.

WHAT USERS CAN DO ON THIS APP:
- Report garbage: Take a photo, enter the location, and submit a complaint
- Check reports: See all submitted garbage complaints and their cleanup status
- Read blogs: Read articles about cleanliness and environment
- Write a blog: Share your own environmental awareness article
- Donate: Support our cleanup work with a small donation
- Our Work: See photos and results of cleanups done by our teams
- Profile: Update your personal details or manage your newsletter subscription
- Newsletter: Get email updates when areas near you are cleaned

REPORT STATUS EXPLAINED:
- Pending: Your complaint is received, our team will look into it soon
- Assigned: A cleanup team has been sent to the location
- Cleaned: The garbage has been removed successfully

LIVE STATS:
- Total complaints submitted: ${totalReports}
- Waiting to be cleaned: ${pendingReports}
- Team assigned: ${assignedReports}
- Already cleaned: ${cleanedReports}
- Cleanup teams active: ${totalTeams}
- Blogs published: ${totalBlogs}
- Total donations received: ₹${donationTotal.toLocaleString('en-IN')}
${userReportsSummary}

CURRENT USER: ${userName || 'Guest'}

IMPORTANT RULES:
- NEVER mention URLs, routes, or technical terms like /report, /auth/profile, API, etc.
- Instead say things like: "Go to the Report Garbage page", "Click on View Reports", "Visit your Profile"
- Use simple, everyday language that anyone can understand
- Keep answers short and clear — 2 to 4 sentences max
- Only answer questions about this app, garbage, cleanliness, or environment
- For unrelated questions, politely say you can only help with Swachh Sena topics`;
}

exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.session.userId;
    const userName = req.session.name;

    if (!userId || req.session.role === 'admin') return res.status(403).json({ error: 'Not available' });
    if (!message || message.trim() === '') return res.status(400).json({ error: 'Message cannot be empty' });

    await ChatMessage.create({ userId, message: message.trim(), sender: 'user' });

    let botResponse = '';
    try {
      const systemPrompt = await getProjectContext(userId, userName);
      const out = await chatCompletion({
        accessToken: HF_TOKEN,
        model: 'meta-llama/Llama-3.1-8B-Instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message.trim() }
        ],
        max_tokens: 512
      });
      botResponse = out.choices[0].message.content.trim();
    } catch (apiError) {
      console.error('Hugging Face API error:', apiError.message);
      botResponse = 'I am here to help with garbage reporting and environmental concerns. How can I assist you?';
    }

    await ChatMessage.create({ userId, message: botResponse, sender: 'bot' });

    res.json({ success: true, botResponse });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId || req.session.role === 'admin') return res.status(403).json({ error: 'Not available' });

    const messages = await ChatMessage.find({ userId }).sort({ createdAt: 1 }).limit(50);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

exports.clearHistory = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId || req.session.role === 'admin') return res.status(403).json({ error: 'Not available' });

    await ChatMessage.deleteMany({ userId });
    res.json({ success: true });
  } catch (error) {
    console.error('Clear error:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
};
