// Public-records law by state — the name and its statutory citation, so any
// page can name the right law for its county instead of hardcoding Arkansas.
const FOIA = {
  Arkansas: { name: 'Arkansas Freedom of Information Act', cite: 'Ark. Code § 25-19-101 et seq.' },
  Texas: { name: 'Texas Public Information Act', cite: 'Tex. Gov’t Code ch. 552' },
  Massachusetts: { name: 'Massachusetts Public Records Law', cite: 'M.G.L. c. 66, § 10' },
  California: { name: 'California Public Records Act', cite: 'Cal. Gov’t Code § 7920.000 et seq.' },
  Hawaii: { name: 'Hawaii Uniform Information Practices Act', cite: 'HRS ch. 92F' },
  'North Carolina': { name: 'North Carolina Public Records Law', cite: 'N.C. Gen. Stat. ch. 132' },
  Colorado: { name: 'Colorado Open Records Act', cite: 'C.R.S. § 24-72-200.1 et seq.' },
  Virginia: { name: 'Virginia Freedom of Information Act', cite: 'Va. Code § 2.2-3700 et seq.' },
  Tennessee: { name: 'Tennessee Public Records Act', cite: 'Tenn. Code § 10-7-503 et seq.' },
  Florida: { name: 'Florida Public Records Act', cite: 'Fla. Stat. ch. 119' },
  Arizona: { name: 'Arizona Public Records Law', cite: 'A.R.S. § 39-121 et seq.' },
  Connecticut: { name: 'Connecticut Freedom of Information Act', cite: 'Conn. Gen. Stat. § 1-200 et seq.' }
};

function foiaOf(state) {
  return FOIA[state] || { name: `the ${state || 'state'} open-records law`, cite: null };
}

module.exports = { foiaOf, FOIA };
