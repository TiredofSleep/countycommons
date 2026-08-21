// Public-records law by state — the name and its statutory citation, so any
// page can name the right law for its county instead of hardcoding Arkansas.
const FOIA = {
  Arkansas: { name: 'Arkansas Freedom of Information Act', cite: 'Ark. Code § 25-19-101 et seq.' },
  Texas: { name: 'Texas Public Information Act', cite: 'Tex. Gov’t Code ch. 552' },
  Massachusetts: { name: 'Massachusetts Public Records Law', cite: 'M.G.L. c. 66, § 10' }
};

function foiaOf(state) {
  return FOIA[state] || { name: `the ${state || 'state'} open-records law`, cite: null };
}

module.exports = { foiaOf, FOIA };
