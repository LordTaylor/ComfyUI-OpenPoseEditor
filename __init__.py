import os
from aiohttp import web
from server import PromptServer

from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

WEB_DIRECTORY = "./web"

# Serve editor static files via dedicated route (outside web/ to avoid
# ComfyUI loading sw.js / workbox as extensions)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

routes = PromptServer.instance.routes

async def _serve_static(request):
    filename = request.match_info["filename"]
    filepath = os.path.join(STATIC_DIR, filename)
    if not os.path.exists(filepath) or not os.path.isfile(filepath):
        raise web.HTTPNotFound()
    return web.FileResponse(filepath)

# Primary route (used by iframe src)
routes.get("/openpose_editor/{filename:.*}")(_serve_static)

# Alias route: editor assets use /open-pose-editor/ base path from build
routes.get("/open-pose-editor/{filename:.*}")(_serve_static)

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
