import { useEffect, useState } from "react";
import { Form, Button } from "react-bootstrap";
import api from "../services/api";

export default function CategoryForm({ initial = {}, onSave }) {
  const safe = initial || {};

  const [categoryList, setCategoryList] = useState([
    {
      name: "Cat1",
      _id: "id1",
    },
    {
      name: "Cat2",
      _id: "id2",
    },
    {
      name: "Cat3",
      _id: "id3",
    },
  ]);

  const [name, setName] = useState(safe.name || "");
  const [parentId, setParentId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, parent: parentId });
  };

  const getCats = async () => {
    const { data } = await api.get("/categories");
    setCategoryList(Array.isArray(data) ? data : data.categories || []);
  };

  useEffect(() => {
    getCats();
  }, []);

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group controlId="catName">
        <Form.Label>Name</Form.Label>
        <Form.Control
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </Form.Group>

      <Form.Select
        aria-label="Default select example"
        name="parent"
        onChange={(e) => setParentId(e.target.value)}
      >
        <option> Null</option>
        {categoryList.map((cat) => (
          <option value={cat._id}>{cat.name}</option>
        ))}
      </Form.Select>

      <div className="text-end mt-3">
        <Button variant="primary" type="submit">
          {safe._id ? "Update" : "Create"}
        </Button>
      </div>
    </Form>
  );
}
