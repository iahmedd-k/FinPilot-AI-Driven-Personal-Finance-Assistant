const Groq = require("groq-sdk");

const apiKey = process.env.GROQ_API_KEY?.trim();
const defaultModel = process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant";

if (!apiKey) {
  const missingKeyError = new Error(
    "Missing Groq key. Set GROQ_API_KEY in server/.env."
  );

  module.exports = {
    chat: {
      completions: {
        create: async () => {
          throw missingKeyError;
        },
      },
    },
  };
} else {
  const groq = new Groq({ apiKey });

  async function createCompletion({ model, ...rest }) {
    const chosenModel = model?.trim() || defaultModel;
    return groq.chat.completions.create({
      model: chosenModel,
      ...rest,
    });
  }

  module.exports = {
    chat: {
      completions: {
        create: createCompletion,
      },
    },
  };
}

