export function extractChoices(message: string) {
  return message.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^[ABC][.)\s:]/i.test(line)).map((line) => ({
    key: line.charAt(0).toUpperCase(),
    label: line.replace(/^([ABC])[.)\s:]+/i, "").trim(),
  }));
}
