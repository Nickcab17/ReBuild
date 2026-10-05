const unavailableOnWeb = () => {
  throw new Error('La implementación nativa del mapa no está disponible en web.');
};

exports.__esModule = true;
exports.default = unavailableOnWeb;
exports.Callout = unavailableOnWeb;
exports.Marker = unavailableOnWeb;
