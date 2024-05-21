var express = require('express');
var router = express.Router();
var productHelpers=require('../helpers/product-helpers');
var userHelper = require('../helpers/user-helper');
const logginVerify=(req,res,next)=>{
  if(req.session.userLoggedIn){
   next();
  }
  else{
   res.redirect('/login')
  }
}

/* GET home page. */
router.get('/',async function(req, res, next) {
  let user = req.session.user;
  console.log("user :",user);
  let cartCount=null;
  if(req.session.user){
    cartCount=await userHelper.getCartCount(req.session.user._id);
  }
  
  productHelpers.getAllProducts().then((products)=>{
    res.render('user/view-products',{admin:false,products,user,cartCount})
   })
  
});

router.get('/signup',(req,res)=>{
 res.render('user/signup')
})
router.get('/login',(req,res)=>{
  if(req.session.user){
    res.redirect('/');
  }
  else{
    res.render('user/login',{"loginErr":req.session.userLoginErr})
    req.session.userLoginErr=false;
  }
   
})

router.post('/signup',(req,res)=>{
   userHelper.doSignUp(req.body).then((resp)=>{
     console.log("final",resp);
     req.session.user.loggedIn=true;
        req.session.user=resp;
        res.redirect('/');
   })
})
router.post('/login',(req,res)=>{
    userHelper.doLogin(req.body).then((response)=>{
      if(response.status){
       
        req.session.user=response.user;
        req.session.user.loggedIn=true;
        res.redirect('/');
      }else{
        req.session.userLoginErr=true;
        res.redirect('/login')
      }
    })
})
router.get('/logout',(req,res)=>{
  req.session.user=null;
  req.session.userLoggedIn=false;
  res.redirect('/');
})

router.get('/cart',logginVerify,async(req,res)=>{
  let products =await userHelper.getCartProducts(req.session.user._id);
  let totalV = await userHelper.getTotalAmount(req.session.user._id)
  
  res.render('user/cart',{products,user:req.session.user,totalV});
})

router.get('/add-to-cart/:id',(req,res)=>{
  console.log("api call");
  userHelper.addToCart(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  })

  // res.redirect('/');
})
router.post('/change-product-quantity',(req,res,next)=>{
  

  userHelper.changeProductQuantity(req.body).then(async(response)=>{
    response.total = await userHelper.getTotalAmount(req.body.user)
res.json(response)
  })
})


router.get('/place-order',logginVerify,async(req,res)=>{
  let total = await userHelper.getTotalAmount(req.session.user._id)
  res.render('user/place-order',{total,user:req.session.user});
})


 router.post('/place-order',async(req,res)=>{
  let products= await userHelper.getCartProductList(req.body.userId);
     
  let totalPrice = await userHelper.getTotalAmount(req.body.userId)
  userHelper.placeOrder(req.body,products,totalPrice).then((orderid)=>{
        if(req.body['payment-method']==='COD'){
          res.json({codSuccess:true})
        }else{
          userHelper.generateRazorPay(orderid,totalPrice).then((response)=>{
              res.json(response)
          })
        }
        
  })
 })

 router.get('/order-success',(req,res)=>{
  res.render('user/order-success',{user:req.session.user});
 })

 router.get('/orders',async(req,res)=>{
  let orders=await userHelper.getUserOrders(req.session.user._id)
  res.render('user/orders',{user:req.session.user,orders})
 })

 router.get('/view-order-products/:id',async(req,res)=>{
  let products = await userHelper.getOrderProducts(req.params.id)
  res.render('user/view-order-products',{user:req.session,products})
 })

 router.post('/verify-payment',(req,res)=>{
  console.log('/verify payment :',req.body)
  userHelper.verifyPayment(req.body).then(()=>{
    userHelper.changePaymentStatus(req.body['order[receipt]']).then(()=>{
     
      res.json({status:true})
    })
  }).catch((err)=>{
    console.log("error status change :",err)
    res.json({status:false,errmsg:''})
  })
 })

module.exports = router;
