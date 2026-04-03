const posts = [
  'How we structured this React app',
  'Deploying frontend to S3 with GitHub Actions',
  'Simple routing patterns for small projects'
];

export default function BlogPage() {
  return (
    <section>
      <h2>Blog</h2>
      <ul>
        {posts.map((post) => (
          <li key={post}>{post}</li>
        ))}
      </ul>
    </section>
  );
}
