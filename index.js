const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s1bw0ez.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const coursesCollection = client.db("AlemenoAcademyDB").collection("courses");
    const usersCollection = client.db("AlemenoAcademyDB").collection("users");

    // Courses related api
    app.get('/courses',async(req,res)=>{
        const result = await coursesCollection.find().toArray();
        res.send(result);
    });
    app.get('/courses/:id', async (req, res) => {
        const id = req.params.id;
        const query = {_id : new ObjectId(id)}
        const result = await coursesCollection.findOne(query);
        res.send(result);
    });


    // User Related API
    app.post('/users',async (req,res)=>{
        const user = req.body;
        const query ={email: user.email}
        const existingUser = await usersCollection.findOne(query);
        if(existingUser){
          return res.send({message: 'user already exists', insertedId : null})
        }
        const result = await usersCollection.insertOne(user);
        res.send(result);
    });
    app.get('/users',async(req,res)=>{
        const result = await usersCollection.find().toArray();
        res.send(result);
    });


    // Cart Related API
    app.post('/carts',async(req,res)=>{
        const cartItem = req.body;
        const result = await coursesCollection.insertOne(cartItem);
        res.send(result);
    });
    app.get('/carts',async(req,res)=>{
        const email = req.query.email;
        const query ={email:email};
        const result = await coursesCollection.find(query).toArray();
        res.send(result);
    });




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);








app.get('/',(req,res)=>{
    res.send('AlemenoAcademy is running');
})
app.listen(port,()=>{
    console.log(`AlemenoAcademy is running on port ${port}`)
})