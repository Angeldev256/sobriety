"use client";

import { useRef, useState, useTransition } from "react";
import { createResource } from "@/app/(site)/resources/actions";
import { FieldError, FormMessage } from "@/components/form-message";
import { INSTITUTIONS, RESOURCE_CATEGORIES } from "@/lib/care/constants";
import { createClient } from "@/lib/supabase/client";
import type { ActionState } from "@/lib/validations";

const MAX_BYTES = 20 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "text/plain": "txt",
};

export function ResourceUploadForm({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const file = data.get("file");
    const hasFile = file instanceof File && file.size > 0;
    if (hasFile && !EXTENSIONS[file.type]) return setState({ ok: false, fieldErrors: { file: ["Please upload a PDF, Word document, image or text file."] } });
    if (hasFile && file.size > MAX_BYTES) return setState({ ok: false, fieldErrors: { file: ["Files must be 20 MB or smaller."] } });

    start(async () => {
      setState(null);
      let filePath: string | null = null;
      const supabase = createClient();
      if (hasFile) {
        filePath = `${userId}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
        const { error } = await supabase.storage.from("resources").upload(filePath, file, { contentType: file.type, upsert: false });
        if (error) {
          setState({ ok: false, message: "The file didn't upload. Please check your connection and try again." });
          return;
        }
      }
      const res = await createResource({
        title: String(data.get("title") ?? ""),
        description: String(data.get("description") ?? ""),
        institution: String(data.get("institution") ?? ""),
        category: String(data.get("category") ?? ""),
        source_url: String(data.get("source_url") ?? ""),
        file_path: filePath,
        file_name: hasFile ? file.name.slice(0, 200) : null,
        file_size: hasFile ? file.size : null,
        mime_type: hasFile ? file.type : null,
        permission: data.get("permission") === "on",
      });
      // Don't leave an orphaned file behind if the details were rejected.
      if (!res?.ok && filePath) await supabase.storage.from("resources").remove([filePath]);
      if (res?.ok) formRef.current?.reset();
      setState(res);
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      className="space-y-5"
      noValidate
    >
      <div>
        <label htmlFor="title" className="label">Title</label>
        <input id="title" name="title" className="input" maxLength={160} />
        <FieldError state={state} name="title" />
      </div>
      <div>
        <label htmlFor="institution" className="label">Institution</label>
        <input id="institution" name="institution" className="input" list="institutions" maxLength={120} defaultValue={INSTITUTIONS[0]} />
        <datalist id="institutions">{INSTITUTIONS.map((i) => <option key={i} value={i} />)}</datalist>
        <FieldError state={state} name="institution" />
      </div>
      <div>
        <label htmlFor="category" className="label">Category</label>
        <select id="category" name="category" className="input" defaultValue="guide">
          {RESOURCE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <FieldError state={state} name="category" />
      </div>
      <div>
        <label htmlFor="description" className="label">Short description <span className="font-normal text-muted">— optional</span></label>
        <textarea id="description" name="description" rows={3} maxLength={600} className="input" />
        <FieldError state={state} name="description" />
      </div>
      <div>
        <label htmlFor="file" className="label">File <span className="font-normal text-muted">— PDF, Word, image or text, up to 20 MB</span></label>
        <input id="file" name="file" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt" className="block w-full text-sm file:mr-4 file:rounded-full file:border file:border-ash file:bg-transparent file:px-4 file:py-2 file:font-semibold" />
        <FieldError state={state} name="file" />
      </div>
      <div>
        <label htmlFor="source_url" className="label">Link to the original <span className="font-normal text-muted">— optional with a file</span></label>
        <input id="source_url" name="source_url" type="url" inputMode="url" className="input" placeholder="https://" maxLength={500} />
        <FieldError state={state} name="source_url" />
      </div>
      <label className="flex gap-3 text-sm leading-relaxed">
        <input type="checkbox" name="permission" className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
        <span>I confirm this material is published by the institution named, and we have permission to share it here.</span>
      </label>
      <FieldError state={state} name="permission" />
      <FormMessage state={state} />
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Uploading…" : isAdmin ? "Publish resource" : "Submit for review"}
      </button>
    </form>
  );
}
