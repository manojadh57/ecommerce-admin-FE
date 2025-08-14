export default function ProductCard({ item, onEdit, onDelete }) {
  const imageSrc =
    (item?.images?.[0]?.includes?.("http")
      ? item.images[0]
      : (import.meta.env.VITE_ROOT_URL || "http://localhost:8000") +
        "/" +
        (item?.images?.[0] || "")) || "https://via.placeholder.com/200";

  return (
    <div className="col-md-3 mb-4">
      <div className="card h-100 shadow-sm">
        <img
          src={imageSrc}
          alt={item?.name || "Product"}
          className="card-img-top object-fit-cover"
          style={{ height: 160 }}
        />
        <div className="card-body d-flex flex-column">
          <h6 className="card-title">{item?.name}</h6>
          <div className="text-muted mb-2">
            ${Number(item?.price ?? 0).toFixed(2)} · Stock: {item?.stock ?? 0}
          </div>
          <div className="mt-auto d-flex gap-2">
            <button className="btn btn-sm btn-outline-primary" onClick={onEdit}>
              Edit
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => onDelete(item?._id)}
            >
              Del
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
