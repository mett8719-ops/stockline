export const PASSWORD_RULES = [
  { label: "Au moins 8 caractères", test: (password) => password.length >= 8 },
  { label: "Une majuscule", test: (password) => /[A-Z]/.test(password) },
  { label: "Une minuscule", test: (password) => /[a-z]/.test(password) },
  { label: "Un chiffre", test: (password) => /[0-9]/.test(password) },
  { label: "Un caractère spécial", test: (password) => /[^A-Za-z0-9]/.test(password) },
];

export function isStrongPassword(password) {
  return PASSWORD_RULES.every(({ test }) => test(password)) && password.length <= 128;
}
