export const extractPrice = (text = "") => {
  if (!text) return "";

  const cleaned = String(text)
    .replace(/,/g, "")
    .match(/₹?\s?(\d+(\.\d+)?)/);

  return cleaned ? cleaned[1] : "";
};
