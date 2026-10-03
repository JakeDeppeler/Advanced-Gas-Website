import { BlogEditorPage } from "../editorPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit a post — Team portal" };

export default function EditPostPage({ params }: { params: { slug: string } }) {
  return <BlogEditorPage slug={params.slug} />;
}
