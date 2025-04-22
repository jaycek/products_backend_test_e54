const express = require('express')
const mongoose = require('mongoose')
const Product = require('./model/product')

const app = express()

const jwt = require('jsonwebtoken')
require('dotenv').config()
const secret_key=process.env.JWT_SECRET_KEY
const cors = require('cors');
const bcrypt = require('bcrypt')

app.use(cors({
    origin: process.env.LIVE_URL, // Allow only your frontend origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  }));

app.use(express.json())

app.get('/',(req,res)=>{
    res.send('Hello world')
})

async function main(){
    const db_url = process.env.MONGODB_URL
    await mongoose.connect(db_url)
}

main()
.then(()=>console.log("DB connected"))
.catch(err=>console.log(err))


const authenticateToken = (req,res,next)=>{
    const token = req.headers['authorization']?.split(' ')[1]
    if(!token) return res.sendStatus(401)
    
    jwt.verify(token,secret_key,(err,user)=>{
        if(err) return res.status(403).json(err) //Invalid token
        req.user =user;
        next()
    })

}

//Create product

app.post('/products',authenticateToken,async(req,res)=>{
    try {
        if(!req.body){
            return res.status(400).json({error:"Product details cannot be empty"})
        }
        const product = new Product(req.body)
        await product.save()
        res.status(201).json(product)
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

//Get all products

app.get('/products',async(req,res)=>{
    try {
        const products = await Product.find()
        res.status(200).json(products)

    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

//Aggregate - get product count for price greater than input value
app.get('/products/count/:price',async(req,res)=>{
   
    try {
        const price = Number(req.params.price)
        const productCount = await Product.aggregate([
            {
                $match:{price:{$gt:price}}
            },
            {
                $count:"productCount"
            }
        ])
        res.status(200).send(productCount)
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }

})

//get the average price of all products in the collection


//Get product by id

app.get('/products/:id',async(req,res)=>{

    try {
        const productId = req.params.id
        if (!mongoose.Types.ObjectId.isValid(productId)){
            return res.status(400).json({error:"Invalid Product ID format"})
        }
        const product = await Product.findById(productId)
        if(!product){
            return res.status(404).json({message:'Product not found'})
        }
        else{
            res.status(200).json(product)
        }
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

//Update product
app.patch('/products/:id',async(req,res)=>{

    try {
        const productId = req.params.id
        if(!productId){
            return res.status(400).json({error:"Product ID is required"})
        }
        console.log(req.body)
        if(!req.body || Object.keys(req.body).length === 0){
            return res.status(400).json({error:"Product details cannot be empty"})
        }
        if (!mongoose.Types.ObjectId.isValid(productId)){
            return res.status(400).json({error:"Invalid Product ID format"})
        }
        const product = await Product.findByIdAndUpdate(productId,req.body,{new:true})
        res.status(200).json(product)
        
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }

})

//Delete product

app.delete('/products/:id',async(req,res)=>{

    try {
        const productId = req.params.id
        if(!productId){
            return res.status(400).json({error:"Product ID is required"})
        }
        
        if (!mongoose.Types.ObjectId.isValid(productId)){
            return res.status(400).json({error:"Invalid Product ID format"})
        }
        const product = await Product.findByIdAndDelete(productId)
        if(!product){
            return res.status(404).json({message:"Product not found"})
        }
        else{
            res.status(200).json({message:"Product deleted succesfully"})
        }
               
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }

})

//Users
const User = require('./model/user')

//create user - Signup form from frontend

app.post('/user',async (req,res)=>{
    try {
        if(!req.body){
            return res.status(400).json({error:"User details cannot be empty"})
        }
        const saltRounds = 10
        bcrypt.hash(req.body.password,saltRounds, async(err,hash)=>{

            var userItem={
                name:req.body.name,
                email:req.body.email,
                password:hash,
                createdAt:new Date()
            }
            var user = new User(userItem)
            await user.save()
            res.status(201).json(user)

        }) }
        catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

//Login  - Signin from frontend

app.post('/login', async (req,res)=>{

    try {
        if(!req.body){
            return res.status(400).json({error:"Login details cannot be empty"})
        }
        
        const {email,password} = req.body
        
        const user = await User.findOne({email:email})
        if(!user){
            return res.status(404).json({message:"User not found"})
        }
        console.log(user) 
        const isValid = await bcrypt.compare(password,user.password)
        if(!isValid){
            return res.status(500).json({message:"Invalid password"})
        }

        //Create token
        let payload = {user:email}
        
        let token = jwt.sign(payload,secret_key)
        res.status(200).json({message:'Login succesful',token:token})

    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})
const port = process.env.PORT
app.listen(port,()=>{
    console.log("Server started")
})
