const translate = require("google-translate-api-x");

const languageMiddleware = (req, res, next) => {
  if (!req.session.language) {
    req.session.language = 'en';
  }
  res.locals.language = req.session.language;
  res.locals.subscriberEmail = req.session.subscriberEmail || null;
  next();
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const translateText = async (text, targetLang) => {
  if (targetLang === 'en' || !text || text.trim().length === 0) return text;
  try {
    const result = await translate(text, {
      to: targetLang,
      rejectOnPartialFail: false,
      forceBatch: false
    });
    return result.text || text;
  } catch (error) {
    return text;
  }
};

module.exports = { languageMiddleware, translateText, sleep };
