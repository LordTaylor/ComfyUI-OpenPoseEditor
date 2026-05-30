import os
import torch
import numpy as np
from PIL import Image
import folder_paths


class OpenPoseEditorNode:
    """
    ComfyUI node embedding ZhUyU1997/open-pose-editor as an in-graph 3D pose editor.
    Outputs pose, depth, and canny images for use with ControlNet.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "width": ("INT", {
                    "default": 512, "min": 64, "max": 2048, "step": 64,
                    "display": "number"
                }),
                "height": ("INT", {
                    "default": 768, "min": 64, "max": 2048, "step": 64,
                    "display": "number"
                }),
            },
            "optional": {
                "pose_file":  ("STRING", {"default": ""}),
                "depth_file": ("STRING", {"default": ""}),
                "canny_file": ("STRING", {"default": ""}),
            }
        }

    RETURN_TYPES = ("IMAGE", "IMAGE", "IMAGE")
    RETURN_NAMES = ("pose", "depth", "canny")
    FUNCTION = "get_outputs"
    CATEGORY = "OpenPose Editor"
    OUTPUT_NODE = False

    def get_outputs(self, width, height, pose_file="", depth_file="", canny_file=""):
        input_dir = folder_paths.get_input_directory()

        def load_image(filename, w, h):
            """Load image from input dir or return black placeholder."""
            if not filename:
                return torch.zeros(1, h, w, 3)
            path = os.path.join(input_dir, filename)
            if not os.path.exists(path):
                return torch.zeros(1, h, w, 3)
            with Image.open(path) as img:
                img_rgb = img.convert("RGB").resize((w, h), Image.LANCZOS)
            arr = np.array(img_rgb).astype(np.float32) / 255.0
            return torch.from_numpy(arr).unsqueeze(0)

        pose  = load_image(pose_file,  width, height)
        depth = load_image(depth_file, width, height)
        canny = load_image(canny_file, width, height)

        return (pose, depth, canny)


NODE_CLASS_MAPPINGS = {
    "OpenPoseEditorNode": OpenPoseEditorNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "OpenPoseEditorNode": "Open Pose Editor 3D",
}
