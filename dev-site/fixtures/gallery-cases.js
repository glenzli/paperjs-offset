const createShowcaseCases = require('./showcase-cases.js');
const createStressCases = require('./stress-cases.js');

module.exports = function createGalleryCases(paper) {
  return createShowcaseCases(paper).concat(createStressCases(paper));
};
