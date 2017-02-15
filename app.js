var http=require('http');
var express=require('express');
var fs=require('fs');

var app=express();
var path=require('path');
app.use(express.static(path.join(__dirname, 'public')));

var nbJoueurs=0;

function joueurs(){
	this.liste=[];

	this.ajouterJoueur = function(nomJoueur){
		this.liste.push(nomJoueur);
	}

	this.inList = function(nomJoueur){
		for(i=0;i<this.liste.length;i++){
			if(this.liste[i]==nomJoueur)
				return true;
		}
		return false;
	}

	this.enleverJoueur = function(nomJoueur){
		for(var i=0; i<this.liste.length; i++)
			if(this.liste[i]==nomJoueur){
				if(i!=this.liste.length-1)
					for(var j=i; j<this.liste.length-1; j++)
						this.liste[j]=this.liste[j+1];
				this.liste.length--;
			}
	}
};

var listeAttente=new joueurs();

var listeJoueurs=new joueurs();

app.use(express.static('public')); //tell the server that ./public/ contains the static webpages

var server=http.createServer(function(req, res){
	fs.readFile('./public/index.html', 'utf-8', function(err, content){
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.end(content);
	});
});

var io=require('socket.io').listen(server);

io.sockets.on('connection', function(socket){
	if(listeJoueurs.liste.length==2)
		socket.emit('peutPasJouer');

	socket.on('nouveau_pseudo', function(pseudo){
		if(listeJoueurs.liste.length<2)
			listeJoueurs.ajouterJoueur(pseudo);

		else if(listeJoueurs.liste.length==2){
        	console.log('nouveau joueur dans la liste');
        	listeAttente.ajouterJoueur(pseudo);
        }

        console.log(listeJoueurs.liste.length+ ' joueurs et liste dattente: '+listeAttente.liste);
        console.log('liste joueurs: '+listeJoueurs.liste);

		socket.pseudo=pseudo;
		socket.emit('joueur1', socket.pseudo);
	});

	socket.on('adversaire', function(pseudoAdversaire){
		socket.broadcast.emit('joueur2', pseudoAdversaire);
	});

	socket.on('case', function(infos){
		socket.broadcast.emit('caseAdversaire', {numCase: infos.numCase, adversaireWin: infos.winner});
	});

	socket.on('disconnect', function(){
		if(listeJoueurs.inList(socket.pseudo)){
			var next=listeAttente.liste[0];
			listeJoueurs.enleverJoueur(socket.pseudo);
			listeAttente.enleverJoueur(next);
			if(next!=null)
				listeJoueurs.ajouterJoueur(next);
			socket.broadcast.emit('peutJouer', next);
		}
		else if(listeAttente.inList(socket.pseudo)) //si le joueur est das la liste d'attente
			listeAttente.enleverJoueur(socket.pseudo); //on l'en enleve

		console.log(listeJoueurs.liste.length+' joueurs et liste: '+listeAttente.liste);
		console.log('liste joueurs: '+listeJoueurs.liste);
	});
});

console.log('Server running and listening on port 8080');
server.listen(8080);
