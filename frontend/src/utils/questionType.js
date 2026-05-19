export const SINGLE_CHOICE_LABEL = "Single choice";
export const MULTIPLE_CHOICE_LABEL = "Multiple choice";

export const normalizeText = (value) =>
  String(value ?? "")
    .replace(/[\u0111\u0110]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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

const uniqueAnswers = (answers) =>
  [...new Set(answers.map(item => String(item).trim()).filter(Boolean))];

const OPTION_CODE_TO_INDEX = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
};

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
  const answer = question?.answer;

  if (Array.isArray(answer)) {
    return uniqueAnswers(answer);
  }

  const answerText = String(answer ?? "").trim();
  if (!answerText) return [];

  const exactOption = question?.options?.find(option => option === answerText);
  if (exactOption) return [exactOption];

  const parsedByCode = parseAnswerCodesByOptions(answerText, question?.options || []);
  if (parsedByCode && parsedByCode.length > 0) {
    return parsedByCode;
  }

  const parsedByOptionText = parseAnswerTextByOptions(answerText, question?.options || []);
  if (parsedByOptionText && parsedByOptionText.length > 0) {
    return uniqueAnswers(parsedByOptionText);
  }

  return splitDelimitedAnswerText(answerText);
};

export const areAnswerSetsEqual = (userAnswer, correctAnswer) => {
  const userAnswers = splitAnswerText(userAnswer);
  const correctAnswers = Array.isArray(correctAnswer) ? uniqueAnswers(correctAnswer) : splitDelimitedAnswerText(correctAnswer);

  return (
    userAnswers.length === correctAnswers.length &&
    correctAnswers.every(answer => userAnswers.includes(answer)) &&
    userAnswers.every(answer => correctAnswers.includes(answer))
  );
};

export const isAnswerCorrect = (question, userAnswer) => {
  if (isMultipleChoice(question?.type)) {
    return areAnswerSetsEqual(userAnswer, getCorrectAnswers(question));
  }

  const [correctAnswer = ""] = getCorrectAnswers(question);
  return String(userAnswer ?? "").trim() === String(correctAnswer).trim();
};

export const formatAnswer = (answer) => splitAnswerText(answer).join("; ");

export const formatCorrectAnswer = (question) => getCorrectAnswers(question).join("; ");
