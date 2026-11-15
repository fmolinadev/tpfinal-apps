import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync("src/utilidades/video-youtube.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports });

test("reconoce el video de YouTube sin confundir archivos o dominios ajenos", () => {
  assert.equal(exports.idVideoYoutube("https://www.youtube.com/watch?v=BrKM5CLQn44"), "BrKM5CLQn44");
  assert.equal(exports.idVideoYoutube("https://api.ejemplo.test/archivos/videos/video.mp4"), null);
  assert.equal(exports.idVideoYoutube("https://www.youtube.com.ejemplo.test/watch?v=BrKM5CLQn44"), null);
  assert.equal(exports.idVideoYoutube(null), null);
});
