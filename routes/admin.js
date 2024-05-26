var express = require('express');
var router = express.Router();
var fileUpload = require('express-fileupload');
const productHelpers = require('../helpers/product-helpers');
const userHelper = require('../helpers/user-helper');

/* GET users listing. */
router.get('/', function(req, res, next) {
   productHelpers.getAllProducts().then((products)=>{
    
    res.render('admin/view-products',{admin:true,products})
   })
 
});
router.get('/add-products',(req,res)=>{
  res.render('admin/add-products')
});

router.post('/add-product',(req,res)=>{
 productHelpers.addProduct(req.body,(result)=>{
  res.render('admin/add-products');
  let imag=req.files.image;
  console.log("id 2 : ",result)
  imag.mv('../project/public/product-images/'+result+'.jpg',(err,done)=>{
    if(!err){
      res.redirect('/admin/');
    }
    else{
      console.log("hello error in file upload",err);
      console.log("path:",__dirname)
    }
  })
});
})

router.get('/delete-product/',(req,res)=>{
  let id=req.query.id;
  console.log("hello",id);

  productHelpers.deleteProduct(id).then((result)=>{
    res.redirect('/admin/');
  })
})

router.get('/edit-product/',async (req,res)=>{
  let product = await productHelpers.getProductDetails(req.query.id);
  res.render('admin/edit-products',{prod:product});
})

router.post('/edit-product/',(req,res)=>{
  console.log("id:",req.body);
  let id = req.body.id;
  productHelpers.updateProduct(req.body).then(()=>{
    res.redirect('/admin');

    if(req.files){
      let imag=req.files.img;
      imag.mv('../project/public/product-images/'+id+'.jpg')
    }
    else{
      console.log("no image found")
    }
  })

})

router.get('/allOrders/',async(req,res)=>{
  await userHelper.getAllOrders().then((resp)=>{
   res.render('admin/all-orders',{orders:resp})
  })
  
  
})




module.exports = router;
