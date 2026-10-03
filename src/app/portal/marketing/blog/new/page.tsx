import { BlogEditorPage } from "../editorPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Write a post — Team portal" };

export default function NewPostPage() {
  return <BlogEditorPage slug={null} />;
}
