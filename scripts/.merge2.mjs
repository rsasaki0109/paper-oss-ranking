import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR, readJson, writeJson, parseLinksYaml } from "./lib.mjs";

const cand = JSON.parse(readFileSync("C:\\Users\\rsasa\\AppData\\Local\\Temp\\opencode\\candidates2.json", "utf8"));
const { repoResults } = JSON.parse(readFileSync("C:\\Users\\rsasa\\AppData\\Local\\Temp\\opencode\\verify2-results.json", "utf8"));
const okRepos = new Set(repoResults.filter((r) => r.ok).map((r) => r.n.toLowerCase()));

const DROP_REPOS = new Set([
  "wh200720041/f-loam", "irapkaist/sc_lego_loam", "irapkaist/scancontext", "edgarsucar/imap",
  "kkhuang1212/point-slam", "deepmind/byol", "shu0423/oneformer", "sxyu/plenoxels",
  "xpixelgroup/point-nerf", "waymo-research/block-nerf", "nvlabs/get3d", "3dtopia/lrm",
  "deepmind/tapir", "theia-sfm/theia-sfm", "mobilemanipulation/mobile-aloha", "libero-project/libero",
]);
const repoCaseFix = { "commonroad/commonroad-io": "CommonRoad/commonroad-io" };
const repoAdd = [
  ["sxyu/svox2", "3D Vision"], ["Xharlie/pointnerf", "3D Vision"],
  ["Lifelong-Robot-Learning/LIBERO", "VLA"], ["MarkFzp/mobile-aloha", "VLA"],
  ["eriksandstroem/Point-SLAM", "SLAM"], ["lucidrains/byol-pytorch", "Computer Vision"],
  ["SHI-Labs/OneFormer", "Computer Vision"],
];
const extraPapers = [["3D Vision", "Accelerating 3D Deep Learning with PyTorch3D"]];

// ---- papers ----
const papers = readJson(join(DATA_DIR, "papers.json"), []);
const haveP = new Set(papers.map((p) => String(p.key).toLowerCase()));
let addedP = 0;
for (const [cat, hint] of [...cand.papers, ...extraPapers]) {
  const key = hint.toLowerCase();
  if (haveP.has(key)) continue;
  papers.push({ key, openalex_id: null, doi: null, title: null, authors: [], year: null, venue: null, cited_by_count: null, url: null, category: cat, title_hint: hint });
  haveP.add(key);
  addedP++;
}

// ---- repos ----
const repos = readJson(join(DATA_DIR, "repos.json"), []);
const haveR = new Set(repos.map((r) => r.full_name.toLowerCase()));
let addedR = 0;
for (const [cat, n] of cand.repos) {
  if (DROP_REPOS.has(n.toLowerCase())) continue;
  if (!okRepos.has(n.toLowerCase())) { console.log("SKIP unverified repo " + n); continue; }
  const full = repoCaseFix[n.toLowerCase()] || n;
  if (haveR.has(full.toLowerCase())) continue;
  const [owner, repo] = full.split("/");
  repos.push({ full_name: full, owner, repo, description: null, stars: null, forks: null, language: null, updated_at: null, url: `https://github.com/${full}`, contributors_count: null, category: cat });
  haveR.add(full.toLowerCase());
  addedR++;
}
for (const [full, cat] of repoAdd) {
  if (haveR.has(full.toLowerCase())) continue;
  const [owner, repo] = full.split("/");
  repos.push({ full_name: full, owner, repo, description: null, stars: null, forks: null, language: null, updated_at: null, url: `https://github.com/${full}`, contributors_count: null, category: cat });
  addedR++;
}
writeJson(join(DATA_DIR, "papers.json"), papers);
writeJson(join(DATA_DIR, "repos.json"), repos);

const LINKS = [
  ["tandem: tracking and dense mapping", "tum-vision/tandem", "official", ""],
  ["dynaslam: tracking, mapping and inpainting", "BertaBescos/DynaSLAM", "official", ""],
  ["suma++: efficient lidar-based semantic slam", "PRBonn/semantic_suma", "official", ""],
  ["go-slam: global optimization", "youmi-zym/GO-SLAM", "official", ""],
  ["nerf-slam: real-time dense monocular slam", "ToniRV/NeRF-SLAM", "official", ""],
  ["nice-slam: neural implicit scalable encoding", "cvg/nice-slam", "official", ""],
  ["point-slam: dense neural point cloud", "eriksandstroem/Point-SLAM", "official", ""],
  ["elasticfusion: real-time dense slam", "mp3guy/ElasticFusion", "official", ""],
  ["bundlefusion: real-time globally consistent", "niessner/BundleFusion", "official", ""],
  ["photo-slam: real-time simultaneous localization", "HuajianUP/Photo-SLAM", "official", ""],
  ["factor graphs and gtsam", "borglab/gtsam", "official", ""],
  ["mixvpr: feature mixing", "amaralibey/MixVPR", "official", ""],
  ["patch-netvlad: multi-scale fusion", "QVPR/Patch-NetVLAD", "official", ""],
  ["cosplace: rethinking visual geo-localization", "gmberton/CosPlace", "official", ""],
  ["xfeat: accelerated features", "verlab/accelerated_features", "official", ""],
  ["r2d2: reliable and repeatable detector", "naver/r2d2", "official", ""],
  ["d2-net: a trainable cnn", "mihaidusmanu/d2-net", "official", ""],
  ["teaser: fast and certifiable point cloud registration", "MIT-SPARK/TEASER-plusplus", "official", ""],
  ["from coarse to fine: robust hierarchical localization", "cvg/Hierarchical-Localization", "official", ""],
  ["blip: bootstrapping language-image pre-training", "salesforce/BLIP", "official", ""],
  ["visual instruction tuning", "haotian-liu/LLaVA", "official", ""],
  ["yolov4: optimal speed and accuracy", "AlexeyAB/darknet", "community", "Darknet ecosystem implementation"],
  ["yolov7: trainable bag-of-freebies", "WongKinYiu/yolov7", "official", ""],
  ["yolox: exceeding yolo series in 2021", "Megvii-BaseDetection/YOLOX", "official", ""],
  ["objects as points", "xingyizhou/CenterNet", "official", ""],
  ["fcos: fully convolutional one-stage", "tianzhi0549/FCOS", "official", ""],
  ["deformable detr: deformable transformers", "fundamentalvision/Deformable-DETR", "official", ""],
  ["segformer: simple and efficient design", "NVlabs/SegFormer", "official", ""],
  ["mask2former: masked-attention mask transformer", "facebookresearch/Mask2Former", "official", ""],
  ["a convnet for the 2020s", "facebookresearch/ConvNeXt", "official", ""],
  ["squeeze-and-excitation networks", "hujie-frank/SENet", "official", ""],
  ["cbam: convolutional block attention module", "Jongchan/attention-module", "official", ""],
  ["grad-cam: visual explanations", "ramprs/grad-cam", "official", ""],
  ["efficientnet: rethinking model scaling", "lukemelas/EfficientNet-PyTorch", "community", "Popular third-party implementation"],
  ["a style-based generator architecture", "NVlabs/stylegan", "official", ""],
  ["progressive growing of gans", "tkarras/progressive_growing_of_gans", "official", ""],
  ["unpaired image-to-image translation using cycle-consistent", "junyanz/pytorch-CycleGAN-and-pix2pix", "official", ""],
  ["esrgan: enhanced super-resolution", "xinntao/ESRGAN", "official", ""],
  ["swinir: image restoration using swin transformer", "JingyunLiang/SwinIR", "official", ""],
  ["raft: recurrent all-pairs field transforms", "princeton-vl/RAFT", "official", ""],
  ["pwc-net: cnns for optical flow", "NVlabs/PWC-Net", "official", ""],
  ["yolov3: an incremental improvement", "AlexeyAB/darknet", "community", "Darknet ecosystem implementation"],
  ["ssd: single shot multibox detector", "amdegroot/ssd.pytorch", "community", "Popular third-party implementation"],
  ["fast r-cnn", "rbgirshick/fast-rcnn", "official", ""],
  ["deep image prior", "DmitryUlyanov/deep-image-prior", "official", ""],
  ["momentum contrast for unsupervised visual representation learning", "facebookresearch/moco", "official", ""],
  ["a simple framework for contrastive learning of visual representations", "google-research/simclr", "official", ""],
  ["bootstrap your own latent", "lucidrains/byol-pytorch", "community", "De-facto standard reimplementation; original repo removed"],
  ["the cityscapes dataset", "mcordts/cityscapesScripts", "official", ""],
  ["yolact: real-time instance segmentation", "dbolya/yolact", "official", ""],
  ["deep high-resolution representation learning", "leoxiaobin/deep-high-resolution-net.pytorch", "official", ""],
  ["simple baselines for human pose estimation and tracking", "microsoft/human-pose-estimation.pytorch", "official", ""],
  ["rmpe: regional multi-person pose estimation", "MVIG-SJTU/AlphaPose", "official", ""],
  ["mediapipe: a framework for building perception pipelines", "google-ai-edge/mediapipe", "official", ""],
  ["facenet: a unified embedding", "davidsandberg/facenet", "community", "Popular third-party implementation"],
  ["arcface: additive angular margin loss", "deepinsight/insightface", "official", ""],
  ["simple online and realtime tracking with a deep association metric", "nwojke/deep_sort", "official", ""],
  ["simple online and realtime tracking", "abewley/sort", "official", ""],
  ["bytetrack: multi-object tracking by associating every detection box", "ifzhang/ByteTrack", "official", ""],
  ["fairmot: on the fairness", "ifzhang/FairMOT", "official", ""],
  ["high performance visual tracking with siamese region proposal network", "STVIR/pysot", "community", "SenseTime tracking toolkit hosting SiamRPN"],
  ["fast online object tracking and segmentation: a unifying approach", "foolwood/SiamMask", "official", ""],
  ["learning discriminative model prediction for tracking", "visionml/pytracking", "community", "Tracking toolkit hosting DiMP"],
  ["learning spatio-temporal transformer for visual tracking", "researchmm/Stark", "official", ""],
  ["is space-time attention all you need for video understanding?", "facebookresearch/TimeSformer", "official", ""],
  ["slowfast networks for video recognition", "facebookresearch/SlowFast", "official", ""],
  ["quo vadis, action recognition?", "deepmind/kinetics-i3d", "official", ""],
  ["videomae: masked autoencoders are data-efficient learners", "MCG-NJU/VideoMAE", "official", ""],
  ["imagebind: one embedding space to bind them all", "facebookresearch/ImageBind", "official", ""],
  ["sparse r-cnn: end-to-end object detection with learnable proposals", "PeizeSun/SparseR-CNN", "official", ""],
  ["yolo-world: real-time open-vocabulary object detection", "AILab-CVC/YOLO-World", "official", ""],
  ["glip: grounded language-image pre-training", "microsoft/GLIP", "official", ""],
  ["per-pixel classification is not all you need", "facebookresearch/MaskFormer", "official", ""],
  ["plenoxels: radiance fields without neural networks", "sxyu/svox2", "official", "Official implementation lives in svox2"],
  ["direct voxel grid optimization", "sunset1995/DirectVoxGO", "official", ""],
  ["kilonerf: speeding up neural radiance fields", "creiser/kiloneRF", "official", ""],
  ["point-nerf: point-based neural radiance fields", "Xharlie/pointnerf", "official", ""],
  ["nerfies: deformable neural radiance fields", "google/nerfies", "official", ""],
  ["d-nerf: neural radiance fields for dynamic scenes", "albertpumarola/D-NeRF", "official", ""],
  ["eg3d: efficient geometry-aware 3d generative adversarial networks", "NVlabs/eg3d", "official", ""],
  ["dreamfusion: text-to-3d using 2d diffusion", "ashawkey/stable-dreamfusion", "community", "Reimplementation; no official code release"],
  ["zero-1-to-3: zero-shot one image to 3d object", "cvlab-columbia/zero123", "official", ""],
  ["one-2-3-45: any single image to 3d mesh", "One-2-3-45/One-2-3-45", "official", ""],
  ["depth anything: unleashing the power", "LiheYoung/Depth-Anything", "official", ""],
  ["towards robust monocular depth estimation", "isl-org/MiDaS", "official", ""],
  ["vision transformers for dense prediction", "isl-org/DPT", "official", ""],
  ["zoedepth: zero-shot transfer", "isl-org/ZoeDepth", "official", ""],
  ["marigold: repurposing diffusion-based image generators", "prs-eth/Marigold", "official", ""],
  ["splatter image: ultra-fast single-view 3d reconstruction", "szymanowiczs/splatter-image", "official", ""],
  ["neus: learning neural implicit surfaces", "Totoro97/NeuS", "official", ""],
  ["implicit neural representations with periodic activation functions", "vsitzmann/siren", "official", ""],
  ["nerf++: analyzing and improving neural radiance fields", "Kai-46/nerfplusplus", "official", ""],
  ["scannet: richly-annotated 3d reconstructions", "ScanNet/ScanNet", "official", ""],
  ["accelerating 3d deep learning with pytorch3d", "facebookresearch/pytorch3d", "official", ""],
  ["pixelsplat: 3d gaussian splats", "dcharatan/pixelsplat", "official", ""],
  ["mvsplat: efficient 3d gaussian splatting", "donydchen/mvsplat", "official", ""],
  ["lgm: large multi-view gaussian model", "3DTopia/LGM", "official", ""],
  ["what and where pathways for robotic manipulation", "cliport/cliport", "official", ""],
  ["transporter networks: rearranging the visual world", "google-research/ravens", "official", "Ravens framework hosts Transporter Networks"],
  ["perceiver-actor: a multi-task transformer", "peract/peract", "official", ""],
  ["robotic view transformer for 3d object manipulation", "NVlabs/RVT", "official", ""],
  ["3d diffusion policy: generalizable visuomotor policy learning", "YanjieZe/3D-Diffusion-Policy", "official", ""],
  ["universal manipulation interface", "real-stanford/universal_manipulation_interface", "official", ""],
  ["calvin: a benchmark for language-conditioned policy learning", "mees/calvin", "official", ""],
  ["rlbench: the robot learning benchmark", "stepjam/RLBench", "official", ""],
  ["meta-world: a benchmark and evaluation", "Farama-Foundation/Metaworld", "official", ""],
  ["robosuite: a modular simulation framework", "ARISE-Initiative/robosuite", "official", ""],
  ["maniskill: generalizable manipulation skill benchmark", "haosulab/ManiSkill", "official", ""],
  ["libero: benchmarking knowledge transfer", "Lifelong-Robot-Learning/LIBERO", "official", ""],
  ["mobile aloha: learning bimanual mobile manipulation", "MarkFzp/mobile-aloha", "official", ""],
  ["daydreamer: world models for physical robot learning", "danijar/daydreamer", "official", ""],
  ["igibson 1.0: a simulation environment", "StanfordVL/iGibson", "official", ""],
  ["sapien: a simulated part-based interactive environment", "haosulab/SAPIEN", "official", ""],
  ["ai2-thor: an interactive 3d environment", "allenai/ai2thor", "official", ""],
  ["learning to walk in minutes", "leggedrobotics/legged_gym", "official", ""],
  ["stable-baselines3: reliable reinforcement learning implementations", "DLR-RM/stable-baselines3", "official", ""],
  ["cleanrl: high-quality single-file implementations", "vwxyzjn/cleanrl", "official", ""],
  ["openai gym", "openai/gym", "official", ""],
  ["deepmind control suite", "google-deepmind/dm_control", "official", ""],
  ["argoverse: 3d tracking and forecasting with rich maps", "argoverse/argoverse-api", "official", ""],
  ["planning-oriented autonomous driving", "OpenDriveLab/UniAD", "official", ""],
  ["vad: vectorized scene representation", "hustvl/VAD", "official", ""],
  ["end-to-end vision-based autonomous driving via spatial-temporal feature learning", "OpenPerceptionX/ST-P3", "official", ""],
  ["surroundocc: multi-camera 3d occupancy prediction", "weiyithu/SurroundOcc", "official", ""],
  ["airsim: high-fidelity visual and physical simulation", "microsoft/AirSim", "official", ""],
];
const yamlPath = join(DATA_DIR, "links.yaml");
const existing = parseLinksYaml(readFileSync(yamlPath, "utf8"));
const haveL = new Set(existing.map((l) => `${l.paper.toLowerCase()}::${l.repo.toLowerCase()}`));
const paperKeys = new Set(papers.map((p) => String(p.key).toLowerCase()));
const repoNames = new Set(repos.map((r) => r.full_name.toLowerCase()));
let out = readFileSync(yamlPath, "utf8").replace(/\s+$/, "") + "\n";
let addedL = 0;
for (const [sub, repo, relation, note] of LINKS) {
  const pk = [...paperKeys].find((k) => k.includes(sub));
  if (!pk) { console.log("LINK-SKIP no paper for: " + sub); continue; }
  if (!repoNames.has(repo.toLowerCase())) { console.log("LINK-SKIP no repo for: " + repo); continue; }
  if (haveL.has(`${pk}::${repo.toLowerCase()}`)) continue;
  const val = pk.includes(": ") ? `"${pk}"` : pk;
  out += `\n- paper: ${val}\n  repo: ${repo}\n  relation: ${relation}\n`;
  if (note) out += `  note: ${note}\n`;
  addedL++;
}
writeFileSync(yamlPath, out);
console.log(`papers +${addedP} = ${papers.length}, repos +${addedR} = ${repos.length}, links +${addedL}`);
