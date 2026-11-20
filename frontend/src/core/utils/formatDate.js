import dayjs from "dayjs";
import "dayjs/locale/fr.js";
import relativeTime from "dayjs/plugin/relativeTime.js";

dayjs.extend(relativeTime);
dayjs.locale("fr");

function parseDate(value) {
  if (value === null || value === undefined || value === "") {
    throw new TypeError("Une date est requise.");
  }

  const date = dayjs(value);

  if (!date.isValid()) {
    throw new RangeError("La date fournie est invalide.");
  }

  return date;
}

export function formatDate(value) {
  return parseDate(value).format("DD/MM/YYYY");
}

export function formatDateTime(value) {
  return parseDate(value).format("DD/MM/YYYY HH:mm");
}

export function formatRelative(value) {
  return parseDate(value).fromNow();
}
