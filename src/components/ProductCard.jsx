export default function ProductCard({ item, onEdit, onDelete }) {
  return (
    <div className="col-md-3 mb-4">
      <div className="card h-100 shadow-sm">
        <img
          src={
            (item.images?.[0].includes("http")
              ? item.images?.[0]
              : import.meta.env.VITE_ROOT_URL + "/" + item.images?.[0]) ||
            "https://via.placeholder.com/200"
          }
          className="card-img-top object-fit-cover"
          style={{ height: 160 }}
        />
        <div className="card-body d-flex flex-column">
          <h6 className="card-title">{item.name}</h6>
          <p className="mb-1 fw-bold">${item.price}</p>
          <span className="badge bg-secondary mb-3">Stock: {item.stock}</span>
          <div className="mt-auto">
            <button
              className="btn btn-sm btn-outline-info me-2"
              onClick={() => onEdit(item)}
            >
              Edit
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => onDelete(item._id)}
            >
              Del
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
