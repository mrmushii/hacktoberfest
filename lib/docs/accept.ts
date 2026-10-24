/** Everything the upload inputs accept. Old binary .doc/.ppt are rejected with a clear message in readUpload. */
export const UPLOAD_ACCEPT = ".pdf,.txt,.md,.docx,.pptx,.doc,.ppt,image/*";
export const MAX_UPLOAD_MB = 4; // Vercel rejects request bodies over 4.5 MB

/** Client-side check so a too-large file fails before uploading. */
export const tooBig = (f: File) => (f.size > MAX_UPLOAD_MB * 1024 * 1024 ? `${f.name} is larger than ${MAX_UPLOAD_MB} MB. Compress it or split it.` : "");
