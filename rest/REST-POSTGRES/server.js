const express = require("express");
const postgres = require("postgres");
const z = require("zod");

const app = express();
const port = 8000;
const sql = postgres({ db: "mydb", user: "postgres", password: "admin" });

app.use(express.json());

// Schemas
const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  about: z.string(),
  price: z.number().positive(),
});

//user's schema
const UserSchema = z.object({
    email: z.string(),
    user_name: z.string(),
    password: z.string(),
});

const UserResponseSchema = z.object({
  user_name: z.string(),
  email: z.string(),
});

//Salt (salage) ==> autre facon de faire. -> le plus recommandé.
const crypto = require("crypto");
function hashPassword(password) {
  return crypto.createHash("sha512").update(password).digest("hex");
}



app.post("/users", async (req, res) => {
  try {
    const parsed = UserSchema.parse(req.body);
    const { user_name, email, password } = parsed;

    
    const hashedPassword = hashPassword(password);

    
    const result = await sql`
      INSERT INTO users (user_name, email, password)
      VALUES (${user_name}, ${email}, ${hashedPassword})
      RETURNING user_name, email
    `;

    const user = result[0];

    const validatedUser = UserResponseSchema.parse({
      ...user,
      email: String(user.email), 
    });

    res.status(201).json(validatedUser);  
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/users/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const parsed = UserSchema.parse(req.body);
    const { user_name, password } = parsed;

    const hashedPassword = hashPassword(password);

    const result = await sql`
      UPDATE users
      SET user_name = ${user_name}, password = ${hashedPassword}, email = ${email}
      WHERE email = ${email}
      RETURNING email, user_name
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    res.json(result[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});



app.patch("/users/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const updates = req.body;

    const UpdateUserSchema = z.object({
      user_name: z.string().min(3).optional(),
      password: z.string().min(6).optional(),
    });
    const parsedUpdates = UpdateUserSchema.parse(updates);

    if (parsedUpdates.password) {
      parsedUpdates.password = hashPassword(parsedUpdates.password);
    }

    const setFragments = [];

    if (parsedUpdates.user_name !== undefined) {
      setFragments.push(sql`user_name = ${parsedUpdates.user_name}`);
    }
    if (parsedUpdates.password !== undefined) {
      setFragments.push(sql`password = ${parsedUpdates.password}`);
    }

    if (setFragments.length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    // Construire la clause SET en concaténant manuellement
    // Exemple : sql`UPDATE users SET `, sql`user_name = ...`, sql`, `, sql`password = ...`, etc.

    let setClause = setFragments[0];
    for (let i = 1; i < setFragments.length; i++) {
      setClause = sql`${setClause}, ${setFragments[i]}`;
    }

    const query = sql`
      UPDATE users
      SET ${setClause}
      WHERE email = ${email}
      RETURNING email, user_name
    `;

    const result = await query;

    if (result.length === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    res.json(result[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
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
