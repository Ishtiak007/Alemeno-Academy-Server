const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
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
    const cartsCollection = client.db("AlemenoAcademyDB").collection("carts");
    const usersCollection = client.db("AlemenoAcademyDB").collection("users");
    const paymentsCollection = client.db("AlemenoAcademyDB").collection("payments");


    //JWT RELATED API
    app.post('/jwt',async(req,res)=>{
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'});
        res.send({token});
    });
    //MIDDLEWARE
    const verifyToken =(req,res,next)=>{
        // console.log('inside varified token',req.headers.authorization);
        if(!req.headers.authorization){
        return res.status(401).send({message:'unauthorized access'});
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
        if(err){
          return res.status(401).send({message: 'unauthorized access'})
        }
        req.decoded=decoded;
        next();
      })
    }

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
        const result = await cartsCollection.insertOne(cartItem);
        res.send(result);
    });
    app.get('/carts',verifyToken,async(req,res)=>{
        const email = req.query.email;
        const query ={email:email};
        const result = await cartsCollection.find(query).toArray();
        res.send(result);
    });
    app.delete('/carts/:id',async(req,res)=>{
        const id = req.params.id;
        const query = {_id : new ObjectId(id)}
        const result = await cartsCollection.deleteOne(query);
        res.send(result)
    });



    // payment intent
    app.post('/create-payment-intent',async(req,res)=>{
        const {price}=req.body;
        const amount = parseInt(price * 100);
        console.log(amount,'amount insite the intent')
  
        const paymentIntent = await stripe.paymentIntents.create({
          amount : amount,
          currency : 'usd',
          payment_method_types:['card']
        });
        res.send({
          clientSecret: paymentIntent.client_secret
        })
      })
      // payment related API
      app.post('/payments', async (req, res) => {
        const payment = req.body;
        const paymentResult = await paymentsCollection.insertOne(payment);
  
        //  carefully delete each item from the cart
        console.log('payment info', payment);
        const query = {
          _id: {
            $in: payment.cartIds.map(id => new ObjectId(id))
          }
        };
  
        const deleteResult = await cartsCollection.deleteMany(query);
  
        res.send({ paymentResult, deleteResult });
      });
      app.get('/payments/:email',verifyToken,async(req,res)=>{
        const query = {email : req.params.email}
        if(req.params.email !== req.decoded.email){
          return res.status(403).send({message: 'forbidden access'})
        }
        const result = await paymentsCollection.find(query).toArray();
        res.send(result)
      });
      //analytics
    //   app.get('/admin-stats',async(req,res)=>{
    //     const users = await usersCollection.estimatedDocumentCount();
    //     const menuItems = await menuCollection.estimatedDocumentCount();
    //     const orders = await paymentCollection.estimatedDocumentCount();
  
    //     // this is not the bese way to revenue
    //     // const payments = await paymentCollection.find().toArray();
    //     // const revenue = payments.reduce((total,payment)=>total+payment.price,0)
    //     const result = await paymentCollection.aggregate([
    //       {
    //         $group:{
    //           _id: null,
    //           totalRevenue: {
    //             $sum: '$price'
    //           }
    //         }
    //       }
    //     ]).toArray();
  
    //     const revenue = result.length > 0 ? result[0].totalRevenue : 0
  
    //     res.send({
    //       users,
    //       menuItems,
    //       orders,
    //       revenue
    //     })
    //   })




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