export const SINGLE_CHOICE_LABEL = "Single choice";
export const MULTIPLE_CHOICE_LABEL = "Multiple choice";

export const normalizeText = (value) =>
  String(value ?? "")
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const uniqueAnswers = (answers) =>
  [...new Set(answers.map(item => String(item).trim()).filter(Boolean))];

export const getOptionText = (option) => {
  if (typeof option === "string") return option;
  return String(option?.text ?? "").trim();
};

export const getOptionImage = (option) => {
  if (!option || typeof option === "string") return null;
  const url = String(option?.image?.url || "").trim();
  const publicId = String(option?.image?.publicId || "").trim();
  return url ? { url, publicId } : null;
};

export const getOptionId = (option, index = 0) => {
  if (typeof option === "string") return `option-${index + 1}`;
  return String(option?.id || `option-${index + 1}`).trim();
};

export const getQuestionImage = (question) => {
  const url = String(question?.questionImage?.url || "").trim();
  const publicId = String(question?.questionImage?.publicId || "").trim();
  return url ? { url, publicId } : null;
};

export const getNormalizedOptions = (options = []) =>
  options.map((option, index) => ({
    id: getOptionId(option, index),
    text: getOptionText(option),
    image: getOptionImage(option),
    raw: option,
  }));

const getOptionTexts = (options = []) => getNormalizedOptions(options).map(option => option.text).filter(Boolean);

const getAnswerOptionIds = (question) =>
  Array.isArray(question?.answerOptionIds)
    ? question.answerOptionIds.map(id => String(id || "").trim()).filter(Boolean)
    : [];

const getAnswerTextsFromOptionIds = (question) => {
  const answerOptionIds = getAnswerOptionIds(question);
  if (answerOptionIds.length === 0) return [];

  return getNormalizedOptions(question?.options || [])
    .filter(option => answerOptionIds.includes(option.id))
    .map(option => option.text)
    .filter(Boolean);
};

export const isMultipleChoice = (type) => {
  const normalizedType = normalizeText(type);

  if (!normalizedType) {
    return false;
  }

  return (
    /\bmultiple\b/.test(normalizedType) ||
    /\bmulti(?:\s+choice)?\b/.test(normalizedType) ||
    /\bcheckbox(?:es)?\b/.test(normalizedType) ||
    /\bchon\s+nhieu\b/.test(normalizedType) ||
    /\bnhieu(?:\s+(?:dap\s+an|lua\s+chon))?\b/.test(normalizedType)
  );
};

export const getQuestionTypeLabel = (type) =>
  isMultipleChoice(type) ? MULTIPLE_CHOICE_LABEL : SINGLE_CHOICE_LABEL;

const generateOptionCodeToIndex = () => {
  const mapping = {};
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    mapping[letter] = i;
  }
  return mapping;
};

const OPTION_CODE_TO_INDEX = generateOptionCodeToIndex();

const splitDelimitedAnswerText = (answer) =>
  String(answer ?? "")
    .split(/[,;\n|]+/)
    .map(item => item.trim())
    .filter(Boolean);

const parseAnswerCodesByOptions = (answer, options = []) => {
  const tokens = splitDelimitedAnswerText(answer).map(item => item.toUpperCase());
  const allTokensAreOptionCodes =
    tokens.length > 0 &&
    tokens.every(token => OPTION_CODE_TO_INDEX[token] !== undefined && options[OPTION_CODE_TO_INDEX[token]]);

  if (!allTokensAreOptionCodes) return null;

  return uniqueAnswers(tokens.map(token => options[OPTION_CODE_TO_INDEX[token]]));
};

const parseAnswerTextByOptions = (answer, options = []) => {
  const parsedAnswers = [];
  let remaining = String(answer ?? "").trim();
  const sortedOptions = [...options].sort((a, b) => b.length - a.length);

  while (remaining) {
    const matchedOption = sortedOptions.find(option => {
      if (!remaining.startsWith(option)) return false;
      const nextChar = remaining.slice(option.length, option.length + 1);
      return nextChar === "" || /[,;\n|]/.test(nextChar);
    });

    if (!matchedOption) return null;

    parsedAnswers.push(matchedOption);
    remaining = remaining.slice(matchedOption.length).trim();

    if (remaining) {
      if (!/^[,;\n|]/.test(remaining)) return null;
      remaining = remaining.slice(1).trim();
    }
  }

  return parsedAnswers;
};

export const splitAnswerText = (answer) => {
  if (Array.isArray(answer)) {
    return uniqueAnswers(answer);
  }

  const answerText = String(answer ?? "").trim();
  return answerText ? [answerText] : [];
};

export const getCorrectAnswers = (question) => {
  const answersFromOptionIds = getAnswerTextsFromOptionIds(question);
  if (answersFromOptionIds.length > 0) {
    return uniqueAnswers(answersFromOptionIds);
  }

  const answer = question?.answer;

  if (Array.isArray(answer)) {
    return uniqueAnswers(answer);
  }

  const answerText = String(answer ?? "").trim();
  if (!answerText) return [];

  const optionTexts = getOptionTexts(question?.options || []);
  const exactOption = optionTexts.find(option => option === answerText);
  if (exactOption) return [exactOption];

  const parsedByCode = parseAnswerCodesByOptions(answerText, optionTexts);
  if (parsedByCode && parsedByCode.length > 0) {
    return parsedByCode;
  }

  const parsedByOptionText = parseAnswerTextByOptions(answerText, optionTexts);
  if (parsedByOptionText && parsedByOptionText.length > 0) {
    return uniqueAnswers(parsedByOptionText);
  }

  return splitDelimitedAnswerText(answerText);
};

export const normalizeUserAnswerValue = (question, value) => {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) return "";

  const normalizedOptions = getNormalizedOptions(question?.options || []);
  const byId = normalizedOptions.find(option => option.id === normalizedValue);
  if (byId) return byId.text;

  return normalizedValue;
};

export const normalizeUserAnswer = (question, answer) => {
  if (Array.isArray(answer)) {
    return uniqueAnswers(answer.map(item => normalizeUserAnswerValue(question, item)));
  }

  const normalizedValue = normalizeUserAnswerValue(question, answer);
  return normalizedValue ? [normalizedValue] : [];
};

export const getAnswerSelectionKey = (question, option, index = 0) => getOptionId(option, index);

export const getOptionMatchesAnswer = (question, option, answerValue, index = 0) => {
  const normalizedAnswer = normalizeUserAnswerValue(question, answerValue);
  const optionId = getOptionId(option, index);
  const optionText = getOptionText(option);
  return normalizedAnswer === optionText || normalizedAnswer === optionId;
};

export const getCorrectAnswerOptionIds = (question) => {
  const explicitIds = getAnswerOptionIds(question);
  if (explicitIds.length > 0) return uniqueAnswers(explicitIds);

  const correctTexts = getCorrectAnswers(question);
  return getNormalizedOptions(question?.options || [])
    .filter(option => correctTexts.includes(option.text))
    .map(option => option.id);
};

export const isCorrectOptionById = (question, option, index = 0) => {
  const optionId = getOptionId(option, index);
  return getCorrectAnswerOptionIds(question).includes(optionId);
};

export const isAnswerSelectedValue = (question, answer, option, index = 0) => {
  const normalizedAnswers = normalizeUserAnswer(question, answer);
  return normalizedAnswers.some(item => getOptionMatchesAnswer(question, option, item, index));
};

export const areAnswerSetsEqual = (userAnswer, correctAnswer) => {
  const userAnswers = Array.isArray(userAnswer) ? uniqueAnswers(userAnswer) : splitDelimitedAnswerText(userAnswer);
  const correctAnswers = Array.isArray(correctAnswer) ? uniqueAnswers(correctAnswer) : splitDelimitedAnswerText(correctAnswer);

  return (
    userAnswers.length === correctAnswers.length &&
    correctAnswers.every(answer => userAnswers.includes(answer)) &&
    userAnswers.every(answer => correctAnswers.includes(answer))
  );
};

export const isAnswerCorrect = (question, userAnswer) => {
  const normalizedUserAnswer = normalizeUserAnswer(question, userAnswer);

  if (isMultipleChoice(question?.type)) {
    return areAnswerSetsEqual(normalizedUserAnswer, getCorrectAnswers(question));
  }

  const [correctAnswer = ""] = getCorrectAnswers(question);
  return String(normalizedUserAnswer[0] ?? "").trim() === String(correctAnswer).trim();
};

export const formatAnswer = (answer) => splitAnswerText(answer).join("; ");
export const formatUserAnswer = (question, answer) => normalizeUserAnswer(question, answer).join("; ");
export const formatCorrectAnswer = (question) => getCorrectAnswers(question).join("; ");

export const getQuestionHasImages = (question) => {
  return Boolean(getQuestionImage(question)) || getNormalizedOptions(question?.options || []).some(option => option.image?.url);
};
