module.exports = {
	port: {
		val: 8000,
		type: 'number',
		desc: "The port the server runs on. If you don't know what this is, don't change it."
	},

	mostListenedPlaylistName: {
		val: 'MostListened',
		type: 'string',
		desc: 'The name of the playlist that stores the songs you listened and how much'
	},

	audioFileExtensions: {
		val: ['.mp3', '.m3a', '.wav'],
		type: 'mult',
		desc: 'The accepted audio file extensions.'
	},

	videoFileExtensions: {
		val: ['.mp4'],
		type: 'mult',
		desc: 'The accepted video file extensions.'
	},

	ignoredAudioFiles: {
		val: ['Darude - Sand Storm.mp3'],
		type: 'mult',
		desc: 'Filter out audio files that appear in the /data/ request. The songs are still accessible through /song/ and via a playlist.'
	},

	ignoredVideoFiles: {
		val: ['My embarrassing video that nobody should see.mp4'],
		type: 'mult',
		desc: 'Filter out video files that appear in the /data/ request. The videos are still accessible through /video/.'
	},

	repeatDefaultOnAudio: {
		val: false,
		type: 'bool',
		desc: 'The audio interface has a repeat button, should that be turned on by default on page load?'
	},

	shuffleDefaultOnAudio: {
		val: false,
		type: 'bool',
		desc: 'The audio interface has a shuffle button, should that be turned on by default on page load?'
	},

	defaultVolume: {
		val: 100,
		type: 'range',
		desc: 'The volume that defaults on page load.'
	},

	defaultSongSort: {
		val: 'Alphabet',
		type: 'selection',
		selection: ['Alphabet', 'Newest', 'Oldest'],
		desc: 'You can sort songs by these. What should be the default?'
	}
}