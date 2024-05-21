var db = require('../config/connection')
let objectId= require('mongodb').ObjectID;

module.exports = {
    addProduct: (product, callback) => { // Added 'callback' parameter
        console.log(product,"hello");
        db.get().collection('product').insertOne(product).then((data) => {
            console.log("id :",data.ops[0]._id);
            callback(data.ops[0]._id)
        })
    },
    getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>{
          let products= await db.get().collection('product').find().toArray();
          resolve(products);
        })
    },
    deleteProduct:(prodId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection('product').removeOne({_id:objectId(prodId)}).then((result=>{
                resolve(result);
            }))

        })
    },
    getProductDetails:(prodId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection('product').findOne({_id:objectId(prodId)}).then((result)=>{
                resolve(result);
            })
        })
    },
    updateProduct:(ProductDetails)=>{
        return new Promise ((resolve,reject)=>{
         db.get().collection('product').updateOne({_id:objectId(ProductDetails.id)},{
            $set:{
                'product-name':ProductDetails.name,
                'product-description':ProductDetails.description,
                'product-price':ProductDetails.price,
                'product-category':ProductDetails.category
            }
         }).then((response)=>{
            resolve(response)
         })
        })
    }
}
