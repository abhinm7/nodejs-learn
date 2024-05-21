const { response } = require('express');
var collection=require('../config/collections');
var db=require('../config/connection');
var bcrypt = require('bcrypt');
let objectId= require('mongodb').ObjectID;
let RazorPay = require('razorpay');
const crypto = require('crypto')


var instances = new RazorPay({
    key_id:'rzp_test_OocPAj8yvZomJh',
    key_secret:'NjrppnV8f91944BVV4qZz79y'

});

module.exports={
    doSignUp:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            userData.password=await bcrypt.hash(userData.password,10);
            db.get().collection(collection.USER_DATA).insertOne(userData).then((data)=>{
                resolve(data.ops[0]);
            })
        })
    
    },
    doLogin:(userData)=>{
        let loginStatus=false;
        let response={};

        return new Promise(async(resolve,reject)=>{
            var user=await db.get().collection(collection.USER_DATA).findOne({email:userData.email});
            console.log(userData.email);
            if(user){
                console.log("User exists");
                bcrypt.compare(userData.password,user.password).then((status)=>{
                    if(status){
                        console.log("login success");
                        response.user=user;
                        response.status=true;
                        resolve(response);
                    }
                    else{
                        console.log("wrong password");
                        resolve({status:false});
                    }
                })
            }
            else{
                console.log("user not exists");
                resolve({status:false});
            }
        })
    },
    addToCart:(productId,userId)=>{
        let proObj = {
            item : objectId(productId),
            quantity : 1
        }
         return new Promise(async(resolve,reject)=>{
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)});

            if(userCart){
                let proExist = userCart.products.findIndex(product => product.item.equals(objectId(productId)));

                
                if(proExist!=-1){
                    db.get().collection(collection.CART_COLLECTION).updateOne({'products.item':objectId(productId)},
                   {
                     $inc:{'products.$.quantity':1}
                   }
                ).then(()=>{
                    resolve()
                })
                }else{
                    db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId)},{
                        
                        $push:{
                            products:proObj
                        }
                    
                
            })
                }
                        
            }else{
                let cartObj = {
                    user:objectId(userId),
                    products:[proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    resolve();
                })
            }
         })
    },
    getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
        let cartItems =await db.get().collection(collection.CART_COLLECTION).aggregate([
            {
                $match:{user:objectId(userId)}
            },
            {
                $unwind:'$products'
            },
            {
                $project:{
                    item:'$products.item',
                    quantity:'$products.quantity'
                }
            },
            {
                $lookup:{
                    from:collection.PRODUCT_COLLECTION,
                    localField:'item',
                    foreignField:'_id',
                    as:'product'
                }
            },
            {
                $project:{
                    item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                }
            }
            // {
            //     $lookup:{
            //        from:collection.PRODUCT_COLLECTION,
            //        let:{proList:'$products'},
            //        pipeline:[{
            //         $match:{
            //             $expr:{
            //                 $in:['$_id',"$$proList"]
            //             }
            //         }
            //        }],
            //        as:'cartItems'
            //     }
            // }
        ]).toArray()
        resolve(cartItems)
        })
    },
    getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count=0;
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(cart){
               count = cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity:(details)=>{
        count = parseInt(details.count);
        quantity = parseInt(details.quantity);

        return new Promise(async(resolve,reject)=>{
           
            if(count==-1 && quantity==1){
                db.get().collection(collection.CART_COLLECTION).updateOne({_id:objectId(details.cart)},{
                    $pull:{products:{item:objectId(details.product)}}
                }).then((response)=>{
                    resolve({removeProduct:true})
                })
            }else{
                db.get().collection(collection.CART_COLLECTION).updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
                {
                  $inc:{'products.$.quantity':count}
                }
             ).then(()=>{
                 resolve({status:true})
             })
            }

            
        })
    },
    getTotalAmount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let total =await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                },
                {
                    $addFields: {
                        priceNumeric: { $toDouble: "$product.product-price" }
                    }
                },
                {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:['$quantity','$priceNumeric']}}
                    }
                }
                
            ]).toArray()
            console.log(total[0].total)
            resolve(total[0].total)
            })
    },
    placeOrder:(order,products,total)=>{
       return new Promise((resolve,reject)=>{
            
            let status = order['payment-method']==='COD'?'placed':'pending';
            let orderObj = {
                deliveryDetails : {
                    mobile:order.phone,
                    address : order.address,
                    pincode : order.pincode

                },
                userId:objectId(order.userId),
                paymentMethod:order['payment-method'],
                products:products,
                totalAmount:total,
                date:new Date(),
                status:status
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(collection.CART_COLLECTION).removeOne({user:objectId(order.userId)})
                resolve(response.ops[0]._id)
            })
       })
    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
             let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
             resolve(cart.products)
           
        })
    },
    getUserOrders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find({userId:objectId(userId)}).toArray()
            
            resolve(orders)
        })
    },
    getOrderProducts:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{_id:objectId(orderId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
            ]).toArray()
            
            resolve(orderItems)
    })
    },
    generateRazorPay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
            
            var options = {
                amount : total*100,
                currency : "INR",
                receipt : orderId
            };
            instances.orders.create(options, function(err,order){
                
                
                resolve(order)
            })
        })
    },
    verifyPayment:(details)=>{
          return new Promise((resolve,reject)=>{
             let hmac = crypto.createHmac('sha256','NjrppnV8f91944BVV4qZz79y')

             hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]'])
             hmac = hmac.digest('hex')
             if(hmac == details['payment[razorpay_signature]']){
                resolve()
             }else{
                reject()
             }
          })
    },
    changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
          
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},
        {
            $set:{
                status:'placed'
            }
        }).then(()=>{
            resolve()
        })
        })
    }
} 
