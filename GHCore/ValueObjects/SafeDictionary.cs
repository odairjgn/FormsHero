using System.Collections.Generic;

namespace GHCore.ValueObjects
{
    public class SafeDictionary<TKey, TValue> : Dictionary<TKey, TValue>
    {
        public new TValue this[TKey key]
        {
            get { return base.TryGetValue(key, out var v) ? v : default; }
            set
            {
                if (!base.ContainsKey(key))
                    base.Add(key, value);
                else
                    base[key] = value;
            }
        }

        public SafeDictionary(IDictionary<TKey, TValue> dic) : base(dic) { }
        public SafeDictionary() : base() { }
    }
}
