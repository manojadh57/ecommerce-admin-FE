import { useState } from "react";
import { Form, Button } from "react-bootstrap";

export default function CategoryForm({ initial = {}, parents = [], onSave }) {
  const safe = initial || {};

  const [name, setName] = useState(safe.name || "");
  const [parent, setParent] = useState(safe.parent || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, parent });
  };
  return (
    <Form onSubmit={handleSubmit}>
      {/* Name */}
      <Form.Group controlId="catName">
        <Form.Label>Name</Form.Label>
        <Form.Control
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </Form.Group>

      {/* Parent selector */}
      <Form.Group className="mt-3">
        <Form.Label>Parent (optional)</Form.Label>
        <Form.Select value={parent} onChange={(e) => setParent(e.target.value)}>
          <option value="">— none (top-level) —</option>

          {parents
            .filter((p) => p._id !== safe._id)
            .map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
        </Form.Select>
      </Form.Group>

      {/* Submit */}
      <div className="text-end mt-4">
        <Button type="submit">{safe._id ? "Update" : "Create"}</Button>
      </div>
    </Form>
  );
}
