import { notFound } from "next/navigation";
import { BlogPostPageClient } from "../BlogPostPageClient";
import { findBlogPost } from "../../../lib/siteNavigation";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = findBlogPost(slug);
  if (!post) {
    notFound();
  }

  return <BlogPostPageClient slug={slug} />;
}
