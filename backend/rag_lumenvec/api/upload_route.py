from fastapi.routing import APIRoute
from starlette.requests import Request

from rag_lumenvec.core import config


class UploadRequest(Request):
    def form(self, *, max_files=None, max_fields=1000, max_part_size=1024 * 1024):
        return super().form(
            max_files=config.MAX_UPLOAD_FILES if max_files is None else max_files,
            max_fields=max_fields,
            max_part_size=max_part_size,
        )


class UploadRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def handle(request: Request):
            return await handler(UploadRequest(request.scope, request.receive))

        return handle
