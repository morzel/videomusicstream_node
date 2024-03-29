/*
*	Finds the video from the filename
*
*	@param {Array} playlists
*		The fileHandler.getJSON.audio.playlists Array
*	@param {String} fileName
*		The playlist file name
*	@return {Object}
*		@param {Boolean} val
*			Stores if the playlist was found
*		@param {Boolean} index
*			The index of the playlist in the array. Less than 0 if not found
*/
function findPlaylist(playlists, name) {
	for (let i = 0; i < playlists.length; i++) {
		if (playlists[i].fileName == name)
			return {val: true, index: i};
	}

	return {val: false, index: -1};
}

module.exports = {
	start: (app, dirname, fileHandler, fs, os, settings, utils, querystring, id3, https, URLModule, ffmpeg) => {
		app.get('/playlist/:playlist', (request, response) => {
			if ('params' in request) {
				if ('playlist' in request.params) {
					const playlistName = request.params.playlist.trim();
					const url = querystring.unescape(request.url);

					console.log(utils.logDate() + ' Got a request for ' + url);

					// Check if it has a file extention, otherwise read the playlists.json file
					if (playlistName.match(/(.+)\.(\w{2,5})/)) {
						fileHandler.getJSON(fs, os, utils, settings).then(json => {
							const inArray = findPlaylist(json.audio.playlists, playlistName);

							// Check if the playlist actually exists
							if (inArray.val == true) {
								const playlist = json.audio.playlists[inArray.index];

								// Let fileHandler.js handle this
								fileHandler.readPlayList(fs, playlist.path + playlist.fileName, json.audio.songs).then(songsArr => {
									response.send({songs: songsArr});
								}).catch(err => {
									console.err('There was an error with reading the playlist', err);
									response.send({error: 'There was an error with reading the playlist', info: err});
								});
							} else response.send({error: `The playlist '${playlistName}' was not found`, info: "The cached JSON file had no reference to this file"});
						}).catch(err => {
							console.err('There was an error with getting the JSON file', err);
							response.send({error: "There was an error with getting the JSON file", info: err});
						});
					} else {
						// If it doesn't have a file extension look for it in the playlists file
						fs.exists('./playlists.json', exists => {
							const parsedUrl = URLModule.parse(url);
							let showFull = false;

							if (parsedUrl) {
								if ('pathname' in parsedUrl) {
									if ('query' in parsedUrl) {
										const queryParameters = querystring.parse(parsedUrl.query);

										if ('full' in queryParameters) {
											if (Boolean(queryParameters.full))
												showFull = Boolean(queryParameters.full);
										}
									}

									if (exists) {
										fs.readFile('./playlists.json', 'utf-8', (err, data) => {
											if (err)
												response.send({success: false, error: 'Cannot read the file', info: err});
											else {
												data = JSON.parse(data);

												if (playlistName == settings.mostListenedPlaylistName.val && !showFull && playlistName in data)
													response.send({success: true, songs: utils.sortJSON(data[settings.mostListenedPlaylistName.val]).map(val => {return val[0]})});
												else if (playlistName == settings.mostListenedPlaylistName.val && showFull && playlistName in data)
													response.send({success: true, songs: utils.sortJSON(data[settings.mostListenedPlaylistName.val])});
												else if (playlistName in data)
													response.send({success: true, songs: data[playlistName]});
												else
													response.send({success: false, error: 'Playlist not found', info: 'The specified playlist wasn\'t found on the server'})
											}
										});
									} else response.send({success: false, error: `The playlist '${playlistName}' was not found`, info: "The 'playlists.json' file had no reference to this file"});
								} else response.send({success: false, error: 'Non valid URL', info: 'The server couln\'t handle the URL`'})
							} else response.send({success: false, error: 'Non valid URL', info: 'The server couln\'t handle the URL'})
						});
					}

					return;
				}
			}

			response.send({
				error: "No playlist found",
				success: false,
			});
		});
		//

		app.get('/song/:songName', (request, response) => {
			const url = querystring.unescape(request.url);

			console.log(utils.logDate() + ' Got a request for ' + url);

			fileHandler.getJSON(fs, os, utils, settings).then(json => {
				const songName = request.params.songName.trim();
				const inArray = findSong(json.audio.songs, songName);

				if (inArray.val == true) {
					const song = json.audio.songs[inArray.index];
					const songPath = song.path + song.fileName;

					response.sendFile(songPath);
				} else response.send({error: `The song '${songName}' was not found`, info: "The cached JSON file had no reference to this file"});
			}).catch(err => {
				console.log(err);
				response.send({error: "There was an error with getting the song", info: err})
			});

			/*
			*	Finds the song from the filename
			*
			*	@param {Array} songs
			*		The fileHandler.getJSON audio.songs Array
			*	@param {String} fileName
			*		The song file name
			*	@return {Object}
			*		@param {Boolean} val
			*			Stores if the song was found
			*		@param {Boolean} index
			*			The index of the song in the array. Less than 0 if not found
			*/
			function findSong(songs, songName) {
				for (let i = 0; i < songs.length; i++) {
					if (songs[i].fileName == songName)
						return {val: true, index: i};
				}

				return {val: false, index: -1};
			}
		});

		app.get('/songInfo/*', (request, response) => {
			const url = querystring.unescape(request.url);
			console.log(utils.logDate() + ' Got a request for ' + url);

			if (!url.endsWith('/')) {
				fileHandler.getJSON(fs, os, utils, settings).then(json => {
					const songName = url.match(/(.+)\/(.+)$/)[2].trim();
					const inArray = findSong(json.audio.songs, songName);

					if (inArray.val == true) {
						const song = json.audio.songs[inArray.index];

						fileHandler.getSongInfo(song.path + song.fileName, id3, fs).then(tags => {
							if (tags.image) {
								if (tags.image.imageBuffer) {
									if (tags.image.imageBuffer.length > 1e7)
										delete tags.image;

									response.send(tags);
									return;
								}
							}

							response.send(tags);
						}).catch(err => response.send({error: 'Couldn\'t find ID3 tags', info: err}));
					} else response.send({error: `The song '${songName}' was not found`, info: "The cached JSON file had no reference to this file"});
				}).catch(err => response.send({error: "There was an error with getting the song", info: err}));
			} else {
				response.send({error: "No song found"});
			}

			/*
			*	Finds the song from the filename
			*
			*	@param {Array} songs
			*		The fileHandler.getJSON audio.songs Array
			*	@param {String} fileName
			*		The song file name
			*	@return {Object}
			*		@param {Boolean} val
			*			Stores if the song was found
			*		@param {Boolean} index
			*			The index of the song in the array. Less than 0 if not found
			*/
			function findSong(songs, songName) {
				for (let i = 0; i < songs.length; i++) {
					if (songs[i].fileName == songName)
						return {val: true, index: i};
				}

				return {val: false, index: -1};
			}
		});

		app.get('/getLyrics/:artist/:songName', (request, response) => {
			const url = querystring.unescape(request.url);
			console.log(utils.logDate() + ' Got a request for ' + url);

			if ('params' in request) {
				if (!('artist' in request.params)) {
					response.send({success: false, error: 'No artist supplied'});
				} else if (!('songName' in request.params)) {
					response.send({success: false, error: 'No title supplied'});
				} else {
					console.log(`${utils.logDate()} Fetching lyrics for '${request.params.songName}' from '${request.params.artist}'`);
					utils.fetch(`https://makeitpersonal.co/lyrics?artist=${request.params.artist}&title=${request.params.songName}`, https, URLModule).then(text => {
						if (text == "Sorry, We don't have lyrics for this song yet.")
							response.send({success: false, error: text + " <a style=\"color: gray\" target=\"_blank\" href=\"https://makeitpersonal.co/songs/new\">Add them yourself.</a>"});
						else
							response.send({success: true, lyrics: text});
					}).catch(err => {
						response.send({success: false, error: err});
					});
				}
			}
		});

		app.get('/OldBrowsers/*', (request, response) => {
			const url = request.url;

			console.log(utils.logDate() + ' Got a request for ' + url);

			fileHandler.getJSON(fs, os, utils, settings).then(json => {
				let html = '';
				const settings = require('./settings.js');

				json.audio.songs.forEach((object, key) => {
					if (!settings.ignoredAudioFiles.val.includes(object.fileName))
						html += `<a href="/song/${object.fileName}" target="_blank">${object.fileName}</a>`;
				});

				response.send(html);
			}).catch(err => response.status(404).send('Error: ' + err));
		});

		app.post('/updatePlaylist', (request, response) => {
			let body = '';

			request.on('data', data => {
				body += data;

				if (body.length > 1e6) {
					request.send({success: false, err: 'The amount of data is to high', info: 'The connection was destroyed because the amount of data passed is to much'});
					request.connection.destroy();
				}
			});

			request.on('end', () => {
				const url = querystring.unescape(request.url);
				let json;

				console.log(utils.logDate() + ' Got a POST request for ' + url);

				try {
					json = JSON.parse(body);
				} catch (err) {
					response.send({error: 'Couldn\'t parse to JSON', info: err});
					return;
				}

				if (json) {
					if (json.name == settings.mostListenedPlaylistName.val)
						response.send({success: false, error: `Cannot access '${json.name}'`, info: "This file is not editable"});
					else
						fileHandler.updatePlaylist(fs, json, settings.mostListenedPlaylistName.val).then(data => response.send(data)).catch(err => response.send(err));
				}
			});
		});

		app.post('/tags*', (request, response) => {
			let body = '';

			const url = querystring.unescape(request.url);
			console.log(utils.logDate() + ' Got a POST request for ' + url);

			request.on('data', data => {
				body += data;

				if (body.length > 1e6) {
					request.send({success: false, err: 'The amount of data is to much', info: 'The connection was destroyed because the amount of data passed is to much'});
					request.connection.destroy();
					return;
				}
			});

			request.on('end', () => {
				let json;

				try {
					json = JSON.parse(body);
				} catch (err) {
					response.send({success: false, info: 'Couln\'t parse JSON'});
					return;
				}

				if (json.tags && json.songName) {
					if (json.songName.toLowerCase().endsWith('.mp3')) {

						fileHandler.getJSON(fs, os, utils, settings).then(songs => {
							/*
							*	Finds the song from the filename
							*
							*	@param {Array} files
							*		The fileHandler.getJSON audio.songs Array
							*	@param {String} songName
							*		The songs name
							*	@return {Object}
							*		The song object
							*/
							function findSong(array, songName) {
								for (let i = 0; i < array.length; i++) {
									if (array[i].fileName == songName)
										return array[i];
								}
							}

							/*
							*	Fetches the image from url
							*
							*	@param {String} url
							*		The image url
							*	@return {Promise}
							*/
							function getImage(url) {
								return new Promise((resolve, reject) => {
									Stream = require('stream').Transform;

									https.request(url, response => {
										const data = new Stream();

										response.on('data', chunk => {
											data.push(chunk);
										});

										response.on('error', reject);
										response.on('end', function() {
											const buffer = data.read();

											if (buffer instanceof Buffer)
												resolve(buffer);
											else
												reject('Not a buffer');
										});
									}).end();
								});
							}

							/*
							*	Gets calles when downloading is done. Handles response
							*/
							function done() {
								const songLocation = findSong(songs.audio.songs, json.songName);

								if (songLocation) {
									if (id3.write(json.tags, songLocation.path + json.songName))
										response.send({success: true});
									else
										response.send({success: false, info: 'Something went wrong with writing the tags'});
								} else response.send({success: false, info: 'Song not found in JSON'});
							}

							if (json.tags.delete) {
								if (id3.removeTags(findSong(songs.audio.songs, json.songName).path + json.songName))
									response.send({success: true});
								else
									response.send({success: false, info: "Tags not deleted"});
							} else {
								if (json.tags.image) {
									getImage(json.tags.image).then(imageBuffer => {
										json.tags.image = imageBuffer;
										done();
									}).catch(err => {
										console.err(err);
										response.send({success: false, info: err})
									});
								} else done();
							}
						}).catch(err => {console.err(err); response.send({success: false, info: JSON.stringify(err)})});
					} else response.send({success: false, info: 'The required tags (tags, songName) are not found.'});
				} else response.send({success: false, info: 'Not an audio file.'});
			});
		});

		app.post('/updateMostListenedPlaylist', (request, response) => {
			let body = '';

			if (!settings.collectMostListened.val) {
				response.send({success: false, err: 'Settings specified that this is not permitted.', info: 'The settings specified that the user doesn\'t want to save songs.'});
				response.set("Connection", "close");
				return;
			}

			request.on('data', data => {
				body += data;

				if (body.length > 1e6) {
					request.send({success: false, err: 'The amount of data is to high', info: 'The connection was destroyed because the amount of data passed is to much'});
					request.connection.destroy();
				}
			});

			request.on('end', () => {
				let songs = {};
				const jsonPath = './playlists.json';
				const url = querystring.unescape(request.url);

				console.log(utils.logDate() + ' Got a POST request for ' + url);
				fileHandler.getJSON(fs, os, utils, settings).then(data => {
					if (data.audio.songs.map(val => {return val.fileName}).includes(body)) {
						fs.exists(jsonPath, exists => {
							if (exists) {
								fs.readFile('./playlists.json', 'utf-8', (err, data) => {

									try {data = JSON.parse(data)} catch (err) {response.send({success: false, data: 'Couldn\'t parse JSON'}); return}
									if (data[settings.mostListenedPlaylistName.val]) {
										songs = data[settings.mostListenedPlaylistName.val];

										if (body in songs) songs[body]++;
										else songs[body] = 1;
									} else songs[body] = 1;

									send();
								});
							} else {
								songs[body] = 1;
								send();
							}

							function send() {
								fileHandler.updatePlaylist(fs, {name: settings.mostListenedPlaylistName.val, songs: songs}, settings.mostListenedPlaylistName.val)
								.then(data => response.send({success: true, data: body + ' successfully added to ' + settings.mostListenedPlaylistName.val}))
								.catch(err => response.send({success: false, data: 'Something happened when tried to add ' + body + ' to ' + settings.mostListenedPlaylistName.val}));
							}
						});
					} else response.send({success: false, data: 'Song not found'});
				}).catch(err => {
					response.send({success: false, data: 'Couldn\'t get songs'});
				})
			});
		});

		/*
		*	Used for testing if the user has a slow network connection
		*	Just routes the received body (which would be a Date) back to the client, so it can calculate the request time
		*/
		app.post('/SlowConnectionTest/', (request, response) => {
			let body = '';

			request.on('data', data => {
				body += data;
			});

			request.on('end', () => {
				response.send(body);
			});
		});
	}
}