const bcrypt = require('bcrypt');
bcrypt.hash('Demo77', 10).then(h => console.log(h));
