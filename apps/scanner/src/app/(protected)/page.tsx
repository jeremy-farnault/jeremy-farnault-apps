export default function WishlistPage() {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-2 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-(--text)">Your wishlist</h1>
      <p className="text-sm text-(--text-muted)">
        Paste a product link to start tracking its price.
      </p>
    </div>
  );
}
