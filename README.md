Name: Logan Heeringa
Assignment 7
When a user logs in or signs up the server will generate a JWT token which it signs with the JWT_SECRET. Client will store this and when the client has future requests, will send it back to prove that they are logged in. The server will verify it.