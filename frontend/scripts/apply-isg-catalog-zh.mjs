/**
 * Applies Chinese translations to zh.json isgLibrary.documentCatalog, subcategories, surveyTags.
 * Run from frontend/: node scripts/apply-isg-catalog-zh.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "..", "messages");
const zhPath = path.join(messagesDir, "zh.json");
const mapPath = path.join(__dirname, "isg-catalog-zh-map.json");

const zh = JSON.parse(fs.readFileSync(zhPath, "utf8"));
const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));

const groups = zh.isgLibrary?.documentCatalog?.groups;
if (!groups) {
  console.error("zh.json: missing isgLibrary.documentCatalog.groups");
  process.exit(1);
}

for (const gv of Object.values(groups)) {
  if (typeof gv.title === "string" && map[gv.title]) {
    gv.title = map[gv.title];
  }
  if (gv.items && typeof gv.items === "object") {
    for (const [itemKey, itemTitle] of Object.entries(gv.items)) {
      if (typeof itemTitle === "string" && map[itemTitle]) {
        gv.items[itemKey] = map[itemTitle];
      }
    }
  }
}

zh.isgLibrary.subcategories = {
  education: ["基础职业健康安全培训", "岗位技能培训", "应急培训", "继续教育与复训"],
  assessment: ["考试", "问卷调查", "评估表单", "测量与监测"],
  forms: ["日常检查", "定期检查", "审核用表"],
  emergency: ["应急预案", "疏散", "消防", "演练", "集合区域"],
  instructions: ["设备操作说明", "作业流程说明", "个体防护装备说明", "现场作业规范"],
};

zh.isgLibrary.surveyTags = {
  measurement: "测评",
  feedback: "反馈",
};

zh.isgLibrary.templateDescription = "{group}——在文档流程中打开「{item}」模板。";

fs.writeFileSync(zhPath, `${JSON.stringify(zh, null, 2)}\n`, "utf8");
console.log("updated", zhPath);
