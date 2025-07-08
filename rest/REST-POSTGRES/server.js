const express = require("express");
const postgres = require("postgres");
const z = require("zod");

const app = express();
const port = 8000;
const sql = postgres({ db: "mydb", user: "postgres", password: "admin" });

app.use(express.json());

// Schemas pour get
const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  about: z.string(),
  price: z.number().positive(),
});



app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/products/:id", async (req, res) => {
  const product = await sql`
    SELECT * FROM products WHERE id=${req.params.id}
    `;
 
  if (product.length > 0) {
    res.send(product[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

app.get("/products/", async (req, res) => {

    const result = await sql `SELECT id, name, about, price FROM products`;

    const validatedProducts = result.map(product => {
        return ProductSchema.parse(product);
    });

    res.json(validatedProducts);

});

const CreateProductSchema = ProductSchema.omit({ id: true });
 
app.post("/products", async (req, res) => {
  const result = await CreateProductSchema.safeParse(req.body);
 
  // If Zod parsed successfully the request body
  if (result.success) {
    const { name, about, price } = result.data;
 
    const product = await sql`
    INSERT INTO products (name, about, price)
    VALUES (${name}, ${about}, ${price})
    RETURNING *
    `;
 
    res.send(product[0]);
  } else {
    res.status(400).send(result);
  }
});

app.delete("/products/:id", async (req, res) => {
  const product = await sql`
    DELETE FROM products
    WHERE id=${req.params.id}
    RETURNING *
    `;

  if (product.length > 0) {
    res.send(product[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});


app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
