import { notFound } from "next/navigation";
import { BlogPostPageClient } from "../BlogPostPageClient";
import { findBlogPost } from "../../../lib/siteNavigation";

type BlogPostPageProps = {
  params: { slug: string };
};

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = findBlogPost(params.slug);
  if (!post) {
    notFound();
  }

  return <BlogPostPageClient slug={params.slug} />;
}
