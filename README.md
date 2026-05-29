# ComfyUI-OpenPoseEditor

A ComfyUI custom node that embeds the **3D Open Pose Editor** as an in-graph modal.  
Design your pose, hit Queue — pose / depth / canny land in your workflow automatically.

---

## Features

- Full **3D pose editor** in a modal dialog (powered by ZhUyU1997's editor)
- **Auto-capture on Queue Prompt** — no manual export needed
- Three outputs: **pose**, **depth**, **canny** as IMAGE tensors ready for ControlNet
- Works with any OpenPose-compatible ControlNet

---

## Installation

### Via ComfyUI Manager
Search `ComfyUI-OpenPoseEditor` and install.

### Manual
```bash
cd ComfyUI/custom_nodes
git clone https://github.com/HerwinKomp/ComfyUI-OpenPoseEditor
# restart ComfyUI
```

---

## Usage

1. Add node: right-click canvas → **OpenPose Editor** → **Open Pose Editor 3D**
2. Set `width` / `height` to match your target canvas
3. Click **✏️ Open Pose Editor** — 3D editor opens in a modal
4. Design your pose
5. Click **✕ Close & Save** — or just press **Queue Prompt** (auto-captures)
6. Connect `pose` output to your ControlNet image input

---

## Outputs

| Output | Type | Notes |
|--------|------|-------|
| `pose` | IMAGE | OpenPose skeleton, black background |
| `depth` | IMAGE | Depth map |
| `canny` | IMAGE | Canny edge map |

---

## Tips

- **IllustriousXL_openpose ControlNet** expects white background — add an **ImageInvert** node between `pose` and ControlNet input
- Recommended ControlNet settings: `strength = 0.85`, `end_percent = 0.55`, sampler `euler_a`
- Example workflow included: `examples/openpose_controlnet_basic.json`

---

## Example Workflow

![workflow preview](examples/openpose_controlnet_basic.json)

Load `examples/openpose_controlnet_basic.json` in ComfyUI for a ready-to-use setup:
**OpenPoseEditorNode → ImageInvert → ControlNet (IllustriousXL_openpose) → KSampler → SaveImage**

---

## Credits & Acknowledgements

This node would not exist without the incredible work of **[ZhUyU1997](https://github.com/ZhUyU1997)**.

The entire 3D pose editing interface — the Three.js skeleton renderer, bone manipulation, camera controls, depth/canny export — is built on his open-source project:

> **[ZhUyU1997/open-pose-editor](https://github.com/ZhUyU1997/open-pose-editor)**  
> *A 3D open pose editor for ControlNet*

This ComfyUI node is simply a wrapper that embeds his editor into the ComfyUI graph system via an iframe + postMessage bridge, adds automatic image capture on queue, and routes the outputs to ComfyUI's tensor pipeline.

All credit for the pose editor itself belongs to ZhUyU1997. If you find this node useful, please consider **starring his original repository** — it's the foundation everything here is built on.

---

## Requirements

- ComfyUI (tested on v0.3+)
- No additional Python dependencies

---

## License

MIT — see [LICENSE](LICENSE).  
The bundled editor (`static/`) is © ZhUyU1997, MIT licensed.
