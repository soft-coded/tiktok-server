export function shuffle(arr: any[]) {
	let cur = arr.length,
		randInd,
		temp;
	while (cur) {
		randInd = Math.floor(Math.random() * cur);
		cur--;
		temp = arr[cur];
		arr[cur] = arr[randInd];
		arr[randInd] = temp;
	}
}
