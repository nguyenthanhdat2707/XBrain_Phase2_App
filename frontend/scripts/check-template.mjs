import { readFile } from "node:fs/promises";
import vm from "node:vm";

const templatePath = new URL("../app.js.tpl", import.meta.url);
const template = await readFile(templatePath, "utf8");
const renderedSource = template.replace("{{ api_base_url }}", "/api");

new vm.Script(renderedSource, { filename: "app.js" });
