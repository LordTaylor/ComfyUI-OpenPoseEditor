# ComfyUI-OpenPoseEditor

A ComfyUI custom node that embeds [ZhUyU1997/open-pose-editor](https://github.com/ZhUyU1997/open-pose-editor) as an in-graph **3D pose editor modal**.

Design your pose in a full 3D editor, then feed pose / depth / canny maps directly into ControlNet — no manual export or file upload needed.

![Node preview](examples/preview.png)

## Features

- **3D pose editor** in a modal dialog (full ZhUyU1997 editor)
- **Auto-capture on Queue Prompt** — no "Send" button needed
- Outputs **pose**, **depth**, and **canny** as IMAGE tensors
- Works with any ControlNet (OpenPose, Canny, etc.)

## Installation

### Via ComfyUI Manager
Search for `ComfyUI-OpenPoseEditor` in the Manager.

### Manual
```bash
cd ComfyUI/custom_nodes
git clone https://github.com/YOUR_USERNAME/ComfyUI-OpenPoseEditor
# restart ComfyUI
```

## Usage

1. Add node: **OpenPose Editor** → **Open Pose Editor 3D**
2. Set `width` / `height` to match your generation canvas
3. Click **✏️ Open Pose Editor** — 3D editor opens in modal
4. Design your pose
5. Click **✕ Close & Save** OR just **Queue Prompt** — pose is captured automatically
6. Connect `pose` output → ControlNet image input

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| `pose` | IMAGE | OpenPose skeleton (black background) |
| `depth` | IMAGE | Depth map |
| `canny` | IMAGE | Canny edge map |

## Tips

- For **IllustriousXL_openpose** ControlNet: add an **ImageInvert** node between pose output and ControlNet (this model expects white background)
- Recommended ControlNet settings: `strength=0.85`, `end_percent=0.55`
- Example workflow: `examples/openpose_controlnet_basic.json`

## Requirements

- ComfyUI (tested on v0.3+)
- No additional Python dependencies

## Credits

- 3D pose editor: [ZhUyU1997/open-pose-editor](https://github.com/ZhUyU1997/open-pose-editor)
