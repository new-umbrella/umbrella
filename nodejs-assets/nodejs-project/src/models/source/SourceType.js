"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceType = void 0;
exports.toSourceType = toSourceType;
var SourceType;
(function (SourceType) {
    SourceType["Audio"] = "Audio";
    SourceType["Image"] = "Image";
    SourceType["Live"] = "Live";
    SourceType["Text"] = "Text";
    SourceType["Video"] = "Video";
    SourceType["Other"] = "Other";
})(SourceType || (exports.SourceType = SourceType = {}));
function toSourceType(type) {
    return SourceType[SourceType[type]];
}
