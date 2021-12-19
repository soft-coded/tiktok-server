export function shuffle(arr: any[]) {
	let cur = arr.length,
		randInd;
	while (cur !== 0) {
		randInd = Math.floor(Math.random() * cur);
		cur--;
		[arr[cur], arr[randInd]] = [arr[randInd], arr[cur]];
	}

	return arr;
}
