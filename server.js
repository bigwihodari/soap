const soap = require("soap");
const fs = require("node:fs");
const http = require("http");
 
// Define the service implementation
const service = {
  ProductsService: {
    ProductsPort: {
      CreateProduct: function (args, callback) {
        // Log args received
        console.log("ARGS : ", args);
 
		// Send response with args and fake id.
        callback({ ...args, id: "myid" });
      },
    },
  },
};