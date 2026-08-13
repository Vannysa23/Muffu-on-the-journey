declare module "jsmediatags/dist/jsmediatags.min.js" {
  interface JsMediaTagsData {
    tags: {
      title?: string
      artist?: string
      album?: string
      [key: string]: unknown
    }
  }

  interface JsMediaTagsCallbacks {
    onSuccess: (tag: JsMediaTagsData) => void
    onError: (error: { type: string; info: string }) => void
  }

  const jsmediatags: {
    read: (file: string, callbacks: JsMediaTagsCallbacks) => void
  }

  export default jsmediatags
}